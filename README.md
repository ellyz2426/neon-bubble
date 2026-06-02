# Neon Bubble VR

A holodeck VR bubble shooter / Puzzle Bobble game built with [IWSDK](https://iwsdk.dev) 0.4.1.

🎮 **[Play Now](https://ellyz2426.github.io/neon-bubble/)**

## Overview

Aim and shoot colored neon energy orbs upward at a hexagonal grid. Match 3+ same-color bubbles to pop them. Disconnected clusters cascade down for bonus points. Features dual-runtime support — play in VR with controllers or in the browser with mouse/keyboard.

## Features

### Core Mechanics
- **Hex grid bubble physics** with odd/even row offsets
- **Match-3 cluster detection** via BFS flood fill
- **Cascade system** for disconnected bubble clusters with falling animation
- **Combo multiplier** (x1 to x10, 3s decay timer)
- **Aim guide line** with wall bounce prediction
- **6 neon bubble colors** with emissive materials, wireframe overlay, additive glow

### Power-ups & Special Bubbles
- **4 power-ups**: Bomb (area explosion), Rainbow (color match), Lightning (row clear), Fire (vertical burn)
- **3 special types**: Frozen (2 hits to break), Stone (indestructible obstacles), Poison (spreads on miss)

### Game Modes (9)
- **Campaign** — 50 levels across zones with progressive difficulty
- **Endless** — Survive as long as possible
- **Time Attack** — 90 seconds, maximize score
- **Precision** — Limited shots based on difficulty
- **Daily Challenge** — Date-seeded layout, same puzzle globally
- **Zen** — No ceiling drops, relaxing play
- **Practice** — No pressure, experiment freely
- **Tournament** — 8-player bracket elimination vs ghost AI
- **Challenge Creator** — Custom layouts with shareable seed codes (XXXX-XXXX)

### Boss Battles (8)
- Frost Sentinel, Toxic Swarm, Iron Fortress, Chaos Engine
- Neon Overlord, Void Titan, Quantum Hydra, Final Boss
- Each with unique mechanics: regenerating bubbles, armored formations, poison chains
- Boss health display in HUD with phase visual effects

### Progression Systems
- **XP/Level progression** — 50 player levels with scaling thresholds
- **Daily streak tracking** — Consecutive day bonuses (+10% to +50% XP)
- **Season/Career prestige** — Bronze → Silver → Gold → Diamond tiers
- **Star rating** — 1-3 stars per campaign level
- **100 achievements** across all game systems with paginated viewer

### Visual & Audio
- **Holodeck environment** — Neon grid floor/ceiling, 14 floating wireframe decorations, 40 ambient particles, fog
- **28+ procedural SFX** — Pop, cascade, shoot, bounce, power-ups, boss warning, streak fanfare, prestige up
- **Synthwave ambient drone** — 6 oscillators with LFO modulation
- **Animated VFX** — Pop bursts, cascade falling, ring bursts, sparkles, shot trails, victory fireworks
- **Screen shake** on big cascades and bomb explosions
- **Boss phase effects** — Lights shift red as boss health drops
- **Enhanced animations** — Power-up scale pulse, combo-reactive glow, launcher fire effect at x5+

### Customization
- **10 bubble skins** with level-based unlocks
- **5 arena themes** with full color customization
- **Color-blind mode** (deuteranopia-friendly palette)
- **Volume controls** — Master, SFX, music (persisted)

### Input
- **VR**: Right thumbstick aim, trigger shoot, B button pause
- **Browser**: Mouse aim, click shoot, ESC pause, R rematch

## Tech Stack
- IWSDK 0.4.1 with dual-runtime (VR + browser)
- 22 PanelUI spatial UI templates (`.uikitml`) — zero HTML DOM overlays
- All UI works in both XR and browser via PanelUI + ScreenSpace + Follower
- TypeScript, Vite, procedural Web Audio API

## Stats
- 25 source files
- 4,653 lines of code
- 22 `.uikitml` UI templates
- 100 achievements
- 10 bubble skins
- 5 arena themes
- 8 unique bosses
- 9 game modes
- 50 campaign levels
