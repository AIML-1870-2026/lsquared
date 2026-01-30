# Enhanced Snake Game - Complete Specification

## Project Overview
A modern, feature-rich implementation of the classic Snake game with advanced gameplay mechanics, visual polish, and stretch challenge features including multiplayer, AI opponent, procedural generation, and level editor.

---

## Core Game Mechanics

### Basic Gameplay
- **Grid-based movement**: Snake moves on a grid with configurable cell size
- **Direction control**: Arrow keys / WASD / Touch swipes (one direction change per frame)
- **Growth mechanism**: Snake grows by 1 segment when eating food
- **Collision detection**: 
  - Self-collision (snake hits itself) = game over
  - Wall collision behavior (configurable: game over OR wrap-around)
  - Obstacle collision = game over
- **Score system**: Points awarded based on food type and current multipliers

### Enhanced Mechanics
- **Dynamic difficulty**: Speed increases progressively with score milestones
- **Multiple food types**:
  - Regular food (10 points, green)
  - Golden food (25 points, gold, rare spawn)
  - Speed food (5 points, reduces speed temporarily, blue)
  - Poison (shrinks snake by 2 segments, -10 points, purple)
- **Power-ups** (temporary, timed effects):
  - Invincibility (15 seconds, rainbow glow)
  - Slow-motion (10 seconds, 50% speed reduction)
  - Score multiplier (20 seconds, 2x points)
  - Ghost mode (12 seconds, pass through walls/obstacles)
- **Obstacles**: Static barriers randomly placed at game start or procedurally generated

---

## Visual Design & Effects

### Theme System
- **Classic theme**: Green snake, black background, simple grid
- **Neon theme**: Glowing colors, dark background, cyberpunk aesthetic
- **Nature theme**: Organic colors, grass background, natural textures
- **Retro theme**: Pixel art style, CRT scanline effect
- **Seasonal themes**: Winter (snow), Halloween (pumpkins), etc.

### Animation & Effects
- **Snake animations**:
  - Smooth interpolation between grid positions
  - Head sprite with direction indicator (eyes/mouth)
  - Segment pulsing when power-up is active
  - Death animation (fade out + particle burst)
- **Food animations**:
  - Gentle floating/bobbing effect
  - Sparkle particles for golden food
  - Consumption particle burst
- **Power-up visual feedback**:
  - Aura/glow effects around snake
  - Screen border color change
  - UI indicator with countdown timer
- **Particle systems**:
  - Trail particles behind snake (theme-dependent)
  - Collision impact effects
  - Level-up celebration effects
- **UI animations**:
  - Score counter number roll
  - Menu transitions (slide/fade)
  - Game over screen dramatic entrance

### Visual Polish
- **Grid rendering**: Optional grid lines with theme-appropriate styling
- **Shadows and depth**: Subtle drop shadows for snake and obstacles
- **Responsive canvas**: Auto-scales to fit window while maintaining aspect ratio
- **Pause overlay**: Semi-transparent with blur effect

---

## Audio Design

### Sound Effects
- **Eating sounds**: Different tones for each food type
- **Power-up sounds**: Activation and deactivation chimes
- **Movement**: Optional subtle slither sound
- **Collision**: Impact sound for walls/obstacles
- **Death**: Game over sound effect
- **UI sounds**: Menu navigation, button clicks
- **Achievement unlocks**: Special fanfare

### Music
- **Background tracks**: Theme-appropriate looping music
- **Dynamic music**: Tempo increases with game speed
- **Mute/volume controls**: Independent music and SFX volume sliders

---

## Game Modes

### 1. Classic Mode (Single Player)
- Standard Snake gameplay with all enhancements
- Progressive difficulty
- High score tracking

### 2. Multiplayer Mode (Local Co-op/Competitive)
- **Two-player simultaneous**:
  - Player 1: WASD controls (Red snake)
  - Player 2: Arrow keys (Blue snake)
  - Shared food pool
  - Collision between snakes = both lose
  - Points race OR survival mode
- **Split-screen option**: Each player has their own board
- **Co-op objectives**: Work together to reach target score

### 3. AI Opponent Mode
- **AI difficulty levels**:
  - Easy: Basic pathfinding to nearest food
  - Medium: Avoid obstacles, basic survival instincts
  - Hard: Strategic food claiming, trap avoidance, aggressive positioning
- **AI behaviors**:
  - Food-seeking using A* or similar pathfinding
  - Danger avoidance (walls, obstacles, self)
  - Space management (don't corner self)
  - Competitive play (block human player)
- **Visual differentiation**: AI snake has distinct color and pattern

### 4. Time Attack Mode
- Race to highest score in 2/5/10 minute sessions
- No game over (respawn after collision with penalty)
- Speed steadily increases

### 5. Puzzle Mode (Level Editor Integration)
- Pre-designed challenge levels
- Objectives: Collect all food, reach target score, survive X seconds
- Star rating system (Bronze/Silver/Gold)

---

## Stretch Challenge Features

### Feature 1: Multiplayer Implementation

#### Technical Approach
- **Local multiplayer**: Both players on same keyboard/screen
- **Input handling**:
  - Separate key listeners for each player
  - Queue system to prevent input conflicts
  - Simultaneous move execution each frame
- **Collision matrix**:
  ```
  Player 1 vs Player 2 head-on = both die
  Player 1 body vs Player 2 head = Player 2 dies
  Same for reverse
  ```
- **Scoring**:
  - Individual scores displayed
  - First to reach target wins
  - OR last snake alive wins
- **UI layout**:
  - Side-by-side score panels
  - Color-coded player indicators
  - Victory screen with winner highlight

#### Multiplayer Variants
- **Race mode**: First to 500 points
- **Survival mode**: Last snake standing
- **Team mode**: Combined score target
- **Battle mode**: Can eat opponent's tail for points

---

### Feature 2: AI Opponent

#### AI Algorithm Design

**Pathfinding Layer** (A* algorithm):
```javascript
function findPathToFood(snakeHead, foodPosition, obstacles) {
  // A* pathfinding avoiding:
  // - Snake body segments
  // - Walls (if not in wrap mode)
  // - Obstacles
  // - Dead ends (look-ahead check)
  return optimalPath;
}
```

**Decision Making**:
1. **Evaluate food options**:
   - Distance to each food item
   - Path safety (no traps)
   - Food value (prioritize golden > regular > speed)
2. **Survival check**:
   - If no safe path to food, find safe open space
   - Avoid corners and enclosed areas
   - Maintain escape routes
3. **Competitive behavior** (Hard mode):
   - Block player from valuable food
   - Force player into corners
   - Claim center-board positions

**Difficulty Tuning**:
- **Easy**: 30% chance of random move, only basic pathfinding
- **Medium**: 70% optimal moves, simple danger avoidance
- **Hard**: 95% optimal moves, strategic positioning, trap setting

#### AI Visual Feedback
- Distinct color scheme (e.g., purple/orange)
- Optional "thinking" indicator
- Different movement pattern (slight variations)

---

### Feature 3: Procedural Level Generation

#### Generation Algorithm

**Wave-based Obstacle Spawning**:
```javascript
function generateLevel(difficulty, waveNumber) {
  const obstacleCount = Math.floor(difficulty * waveNumber * 1.5);
  const patterns = ['scattered', 'maze', 'rooms', 'spiral', 'symmetrical'];
  
  // Select pattern based on wave
  const pattern = patterns[waveNumber % patterns.length];
  
  return createObstaclePattern(pattern, obstacleCount);
}
```

**Pattern Types**:
1. **Scattered**: Random obstacle placement (ensure path exists)
2. **Maze**: Corridor-based layout with dead ends
3. **Rooms**: Chambers connected by passages
4. **Spiral**: Spiral pattern from center
5. **Symmetrical**: Mirror obstacle placement (horizontal/vertical/radial)

**Generation Constraints**:
- Always maintain at least one path from any point to any other point
- Minimum distance between obstacles
- No obstacles near initial snake spawn
- Food spawns in accessible areas only

**Progressive Difficulty**:
- Wave 1-3: Minimal obstacles, scattered pattern
- Wave 4-6: Moderate obstacles, simple mazes
- Wave 7+: Dense obstacles, complex patterns

#### Endless Mode with Procedural Levels
- New level generated every 200 points
- Carry over score and snake length
- Brief "Level Complete" animation
- Increasing obstacle density per level

---

### Feature 4: Level Editor

#### Editor Interface

**Canvas Tools**:
- **Brush mode**: Click to place/remove obstacles
- **Eraser mode**: Click to remove obstacles
- **Fill mode**: Paint multiple cells by dragging
- **Shape tools**: 
  - Line tool
  - Rectangle tool
  - Circle tool (filled/hollow)
- **Snake start position marker**: Place initial spawn point
- **Food spawn zones**: Define areas where food can appear

**Editor UI**:
```
+------------------------------------------+
|  [File] [Edit] [Test] [Export]          |
+------------------------------------------+
|  Tools:                                   |
|  [Brush] [Eraser] [Line] [Rect] [Circle]|
|  Snake Start: [Set Position]             |
|  Board Size: [Width] x [Height]          |
|  [Clear All] [Fill Border]               |
+------------------------------------------+
|                                           |
|          Editor Canvas                    |
|          (Grid with editable cells)       |
|                                           |
+------------------------------------------+
|  Level Name: [___________]                |
|  Difficulty: [Easy/Med/Hard]              |
|  Objective: [Dropdown]                    |
|  Target Score: [___]                      |
|  [Save Level] [Load Level] [Test Play]   |
+------------------------------------------+
```

#### Level Format (JSON)
```json
{
  "name": "The Spiral Challenge",
  "author": "Player1",
  "difficulty": "medium",
  "boardWidth": 30,
  "boardHeight": 30,
  "snakeStart": {"x": 15, "y": 15},
  "obstacles": [
    {"x": 10, "y": 10},
    {"x": 11, "y": 10},
    ...
  ],
  "foodSpawnZones": [
    {"x": 5, "y": 5, "width": 3, "height": 3}
  ],
  "objective": {
    "type": "score", // or "survival", "collectAll"
    "target": 500,
    "timeLimit": null
  },
  "theme": "classic",
  "version": "1.0"
}
```

#### Level Sharing System
- **Export**: Download as JSON file
- **Import**: Upload JSON file to load
- **Local storage**: Save up to 10 custom levels
- **Level browser**: Grid view of saved levels with preview thumbnails
- **Validation**: Check level is solvable before saving

#### Test Play Mode
- **Quick test**: Press "Test" to instantly play current level
- **Return to editor**: ESC key returns to edit mode
- **Iteration**: Make changes and re-test quickly

---

## User Interface Components

### Main Menu
```
╔═══════════════════════════════╗
║        SNAKE EVOLVED          ║
║                               ║
║   [Play Classic Mode]         ║
║   [Multiplayer]              ║
║   [AI Challenge]             ║
║   [Time Attack]              ║
║   [Level Editor]             ║
║   [Settings]                 ║
║   [High Scores]              ║
║                               ║
║   Version 2.0                ║
╚═══════════════════════════════╝
```

### In-Game HUD
```
Score: 0000    High: 0000    Level: 1    Lives: ❤❤❤
[▓▓▓▓▓░░░░░] Speed Boost (5s)
[P] Pause  [M] Mute  [Esc] Menu
```

### Settings Panel
- **Game Settings**:
  - Board size (20x20 to 50x50)
  - Wall behavior (Solid / Wrap-around)
  - Starting speed
  - Difficulty preset
- **Controls**:
  - Key rebinding
  - Swipe sensitivity
- **Audio**:
  - Music volume slider
  - SFX volume slider
  - Individual sound toggles
- **Visual**:
  - Theme selector
  - Grid visibility toggle
  - Particle effects toggle
  - Animation quality (Low/Medium/High)

### High Score Screen
```
╔═════════════════════════════════════╗
║        HALL OF FAME                 ║
╠═════════════════════════════════════╣
║  Rank  Name         Score    Date   ║
║   1.   ASH          5420   12/15    ║
║   2.   SNAKE        4890   12/14    ║
║   3.   PRO          4200   12/13    ║
║   ...                               ║
╠═════════════════════════════════════╣
║  [Filter: All Modes ▼]              ║
║  [Clear Scores]  [Export]           ║
╚═════════════════════════════════════╝
```

---

## Technical Implementation

### Technology Stack
- **HTML5 Canvas**: Main game rendering
- **Vanilla JavaScript**: Core game logic (ES6+)
- **CSS3**: UI styling, animations, themes
- **LocalStorage API**: Save settings, high scores, custom levels
- **Web Audio API**: Sound effects and music

### Code Architecture

```
snake-game/
├── index.html
├── css/
│   ├── main.css
│   ├── themes.css
│   └── animations.css
├── js/
│   ├── main.js              // Entry point, game loop
│   ├── game.js              // Core game state manager
│   ├── snake.js             // Snake class
│   ├── food.js              // Food/power-up manager
│   ├── ai.js                // AI opponent logic
│   ├── multiplayer.js       // Multiplayer game mode
│   ├── levelGenerator.js    // Procedural generation
│   ├── levelEditor.js       // Level editor interface
│   ├── renderer.js          // Canvas rendering
│   ├── particles.js         // Particle system
│   ├── audio.js             // Sound manager
│   ├── ui.js                // Menu and HUD
│   ├── input.js             // Keyboard/touch handler
│   ├── collision.js         // Collision detection
│   └── storage.js           // LocalStorage wrapper
├── assets/
│   ├── sounds/
│   │   ├── eat.mp3
│   │   ├── powerup.mp3
│   │   ├── death.mp3
│   │   └── background.mp3
│   └── images/
│       └── snake-head.png
└── levels/
    └── default-levels.json
```

### Core Classes

#### Snake Class
```javascript
class Snake {
  constructor(x, y, color = 'green') {
    this.segments = [{x, y}];
    this.direction = {x: 1, y: 0};
    this.nextDirection = {x: 1, y: 0};
    this.color = color;
    this.powerUps = [];
    this.score = 0;
  }
  
  update() { /* Move snake, grow if needed */ }
  draw(ctx) { /* Render snake */ }
  changeDirection(newDir) { /* Validate and queue direction */ }
  checkCollision(obstacles, walls) { /* Return collision type */ }
  eatFood(food) { /* Grow, add score, apply effects */ }
  applyPowerUp(powerUp) { /* Add timed effect */ }
}
```

#### AI Class
```javascript
class AISnake extends Snake {
  constructor(x, y, difficulty = 'medium') {
    super(x, y, 'purple');
    this.difficulty = difficulty;
    this.target = null;
  }
  
  think(gameState) {
    // Evaluate options and choose best move
    const foods = gameState.foods;
    const obstacles = gameState.obstacles;
    
    // Find safest, most valuable target
    this.target = this.evaluateTargets(foods, obstacles);
    
    // Calculate path using A*
    const path = this.findPath(this.target, obstacles);
    
    // Make move decision
    if (path && path.length > 0) {
      return this.getDirectionTowards(path[0]);
    }
    
    // Fallback: find safe space
    return this.findSafeDirection(obstacles);
  }
  
  findPath(target, obstacles) { /* A* implementation */ }
  evaluateTargets(foods, obstacles) { /* Target selection */ }
  findSafeDirection(obstacles) { /* Survival behavior */ }
}
```

#### Game Class
```javascript
class Game {
  constructor(mode = 'classic') {
    this.mode = mode;
    this.state = 'menu'; // menu, playing, paused, gameOver
    this.snakes = [];
    this.foods = [];
    this.obstacles = [];
    this.score = 0;
    this.level = 1;
    this.speed = 100; // ms per frame
  }
  
  init() { /* Setup game based on mode */ }
  update(deltaTime) { /* Game loop update */ }
  render(ctx) { /* Draw everything */ }
  handleInput(input) { /* Process player input */ }
  spawnFood() { /* Create food items */ }
  checkCollisions() { /* Detect all collisions */ }
  levelUp() { /* Increase difficulty */ }
}
```

### Game Loop
```javascript
let lastTime = 0;
let accumulator = 0;
const FIXED_TIMESTEP = 1000 / 60; // 60 FPS

function gameLoop(currentTime) {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  accumulator += deltaTime;
  
  // Fixed timestep update
  while (accumulator >= FIXED_TIMESTEP) {
    game.update(FIXED_TIMESTEP);
    accumulator -= FIXED_TIMESTEP;
  }
  
  // Render
  game.render(ctx);
  
  requestAnimationFrame(gameLoop);
}
```

---

## Mobile Optimization

### Touch Controls
- **Swipe detection**: 
  - Minimum distance: 30px
  - Directional threshold: 45-degree cones
  - Prevent default scrolling during gameplay
- **Virtual D-pad**: Optional on-screen buttons
- **Tap to pause**: Double-tap for pause/resume

### Responsive Design
- **Viewport scaling**: Fit canvas to screen while maintaining aspect ratio
- **Portrait vs Landscape**: Different UI layouts
- **Font sizing**: Relative units for readability
- **Touch target sizes**: Minimum 44x44px for buttons

---

## Performance Optimization

### Rendering
- **Dirty rectangle tracking**: Only redraw changed areas
- **Object pooling**: Reuse particle objects
- **Layered canvas**: Static background layer + dynamic game layer
- **RequestAnimationFrame**: Smooth 60 FPS target

### Memory Management
- **Particle cleanup**: Remove dead particles from array
- **Food recycling**: Reuse food objects when possible
- **Event listener cleanup**: Remove on scene change

---

## Accessibility Features

- **Keyboard-only navigation**: Full menu and game control
- **High contrast mode**: Enhanced visibility option
- **Screen reader support**: ARIA labels on UI elements
- **Colorblind-friendly palettes**: Alternative theme colors
- **Reduced motion option**: Disable particle effects and animations
- **Pause on blur**: Auto-pause when window loses focus

---

## Testing Checklist

### Functionality
- [ ] Snake moves correctly in all 4 directions
- [ ] Food spawns in valid locations
- [ ] Collision detection works for all objects
- [ ] Score increments correctly
- [ ] Power-ups activate and deactivate properly
- [ ] Game over triggers appropriately
- [ ] High scores save and load
- [ ] All themes apply correctly

### Multiplayer
- [ ] Both players can control snakes simultaneously
- [ ] Collision between players works correctly
- [ ] Score tracking works for both players
- [ ] Winner declared correctly

### AI
- [ ] AI finds path to food
- [ ] AI avoids obstacles and walls
- [ ] AI doesn't trap itself
- [ ] Difficulty levels behave distinctly

### Level Editor
- [ ] All tools work correctly
- [ ] Levels save/load properly
- [ ] Test play launches successfully
- [ ] Level validation catches errors
- [ ] Export/import works with valid JSON

### Cross-browser
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## Future Enhancement Ideas

### Potential Additions
1. **Online multiplayer**: WebSocket-based network play
2. **Daily challenges**: Procedurally generated with seed
3. **Achievement system**: Unlock badges for accomplishments
4. **Replay system**: Record and playback games
5. **Mod support**: Plugin system for custom game modes
6. **Analytics**: Track player behavior and balance gameplay
7. **Progressive Web App**: Install as standalone app
8. **Leaderboard backend**: Global high scores with server
9. **Social sharing**: Share scores and custom levels
10. **Tournament mode**: Bracket-style competitions

---

## Development Timeline Estimate

**Phase 1: Core Game (Week 1)**
- Basic snake movement and rendering
- Food spawning and collision
- Score system and game over

**Phase 2: Enhancements (Week 2)**
- Power-ups and food types
- Themes and visual effects
- Sound and music integration

**Phase 3: Multiplayer (Week 3)**
- Local multiplayer implementation
- UI for 2-player mode
- Testing and balancing

**Phase 4: AI Opponent (Week 4)**
- Pathfinding algorithm
- AI decision-making logic
- Difficulty tuning

**Phase 5: Procedural Generation (Week 5)**
- Level generation algorithms
- Pattern creation
- Endless mode

**Phase 6: Level Editor (Week 6)**
- Editor UI implementation
- Save/load functionality
- Test play integration

**Phase 7: Polish & Testing (Week 7)**
- Bug fixes
- Performance optimization
- Cross-browser testing
- Mobile optimization

**Total Estimated Time: 7 weeks for full implementation**

---

## Success Metrics

- **Playability**: Game runs smoothly at 60 FPS on modern browsers
- **Engagement**: Average session length > 5 minutes
- **Replayability**: Players return to beat high scores or try different modes
- **Level creation**: Players create and share custom levels
- **Code quality**: Maintainable, well-documented codebase
- **Accessibility**: Playable by users with various abilities

---

## Conclusion

This specification outlines a comprehensive enhancement of the classic Snake game, incorporating modern game design principles, multiple game modes, AI opponents, procedural generation, and creative tools. The implementation will result in a polished, feature-rich game that demonstrates advanced web development skills while remaining fun and accessible to players.

**Key Differentiators:**
- ✅ Full-featured multiplayer support
- ✅ Intelligent AI opponent with multiple difficulty levels
- ✅ Procedural level generation for endless replayability
- ✅ Intuitive level editor with sharing capabilities
- ✅ Rich visual effects and theme system
- ✅ Comprehensive accessibility features

This Snake game will stand out as a modern interpretation that respects the classic while pushing boundaries in terms of features and polish.
