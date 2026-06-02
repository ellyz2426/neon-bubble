# 🫧 Neon Bubble VR

**Holodeck Bubble Shooter / Puzzle Bobble** built with [IWSDK 0.4.1](https://iwsdk.dev) — play in VR or browser!

🎮 [Play Now](https://ellyz2426.github.io/neon-bubble/) | 📦 [GitHub](https://github.com/ellyz2426/neon-bubble)

![IWSDK 0.4.1](https://img.shields.io/badge/IWSDK-0.4.1-00ffff) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 🎯 Core Gameplay
- **Hex grid bubble physics** with odd/even row offsets
- **Match-3 color mechanics** with BFS cluster detection
- **Cascade system** for disconnected bubble clusters
- **Combo multiplier** (x1 to x10, 3-second decay)
- **Aim guide** with wall bounce prediction
- **Ceiling drop** pressure system with difficulty scaling

### 🫧 Bubble Types
- **Standard** — 6 vibrant neon colors (+ color-blind palette)
- **Bomb** — Explosive radius clearing nearby bubbles
- **Rainbow** — Matches any color, targets largest cluster
- **Lightning** — Clears entire row
- **Fire** — Burns through vertical column
- **Frozen** ❄️ — Requires 2 hits to break (cracks on first hit)
- **Stone** 🪨 — Indestructible obstacles that block paths
- **Poison** ☠️ — Spreads to adjacent cells on miss

### 🎮 9 Game Modes
| Mode | Description |
|------|-------------|
| **Campaign** | 50 levels across zones with boss battles every 6th level |
| **Endless** | Survive forever with regenerating rows |
| **Time Attack** | 90 seconds to maximize score |
| **Precision** | Limited shots — make every one count |
| **Daily** | Same puzzle for everyone, changes daily |
| **Zen** | No pressure, no ceiling drops |
| **Practice** | Free play sandbox |
| **Tournament** | Bracket elimination vs ghost AI scores |
| **Challenge** | Custom levels with shareable seed codes |

### 👹 Boss Levels
Every 6th campaign level features a boss battle with unique mechanics:
- **Frost Sentinel** — Frozen bubble formations + stone walls
- **Toxic Swarm** — Poison spreading + bubble regeneration
- **Iron Fortress** — Heavy armor + dense stone defenses
- **Chaos Engine** — All special types combined
- **Neon Overlord** — Maximum specials + fast regen
- **Void Titan** — Extreme density + poison chains
- **Quantum Hydra** — Split formations
- **Final Boss** — Everything at maximum

### ⬆️ XP & Progression
- **50 player levels** with increasing XP thresholds
- **XP earned** from every game (score-based + level completion bonuses)
- **Level-up rewards**: unlock skins and themes at milestone levels
- **Persistent progression** across all game modes

### ⭐ Star Rating
- **1-3 stars** per campaign level based on accuracy, score, and combo performance
- Track your best stars per level
- Achievements for star collection milestones

### 🏆 84 Achievements
Categories: Popping (8), Cascades (6), Combos (6), Score (8), Power-ups (8), Special Bubbles (6), Accuracy (5), Games Played (5), Campaign (6), Boss (6), Tournament (5), XP/Level (5), Mode-specific (7), Cosmetics (4), Stars (2)

Paginated achievement viewer with progress tracking.

### 🏟️ Tournament Mode
- **8-player bracket** elimination (you vs 7 ghost AIs)
- **3 rounds** to the championship
- Ghost scores scale with difficulty and round
- Track tournament wins and flawless victories

### 🎨 Challenge Creator
- Customize: rows, colors, density, special bubble frequency
- Generate **shareable seed codes** (hex format: `XXXX-XXXX`)
- Reproducible layouts from seed codes

### 🎨 Visual Effects
- **Animated bubble pops** (scale up 1.4x → shrink/fade)
- **Cascade falling** with gravity and rotation
- **Ring burst particles** on power-up activation
- **Sparkle effects** on matches and rainbow power-ups
- **Shot trail particles** behind moving bubbles
- **Victory fireworks** on board clears and level completes
- **Screen shake** on big cascades and bomb explosions
- **Danger zone pulsing** — frequency increases with proximity
- **Poison bubble glow pulsing**

### 🎵 Audio
- **25+ procedural SFX** with pitch variation for natural variety
- **Ambient synthwave drone** with chord pads, shimmer, and dual LFO modulation
- **Rising combo sounds** with pitch scaling per combo level
- **Volume controls** (Master, SFX, Music) with **localStorage persistence**
- Boss warning, frozen break, poison spread, and firework sounds

### 🎮 Controls
| Input | Browser | VR |
|-------|---------|-----|
| Aim | Mouse movement | Right thumbstick |
| Shoot | Click | Right trigger |
| Pause | ESC | B button |
| Rematch | R (at game over) | — |

### 🖥️ Technical
- **IWSDK 0.4.1** dual-runtime (VR + browser fallback)
- **20 PanelUI `.uikitml` templates** — zero HTML DOM overlays
- **Head-following HUD** with score/combo/shots/level/time/mode
- **World-space menus** for all screens
- **Follower toast notifications** and countdown
- **Color-blind mode** with deuteranopia-friendly palette
- **All state persisted** in localStorage (stats, achievements, XP, stars, audio settings, skins, themes)

## Architecture

```
neon-bubble/
├── src/index.ts         # Game engine (2534 lines)
├── ui/                  # 20 PanelUI templates
│   ├── title.uikitml
│   ├── modeselect.uikitml
│   ├── difficulty.uikitml
│   ├── hud.uikitml
│   ├── gameover.uikitml
│   ├── levelcomplete.uikitml
│   ├── achievements.uikitml
│   ├── settings.uikitml
│   ├── stats.uikitml
│   ├── skins.uikitml
│   ├── leaderboard.uikitml
│   ├── help.uikitml
│   ├── pause.uikitml
│   ├── countdown.uikitml
│   ├── nextbubble.uikitml
│   ├── toast.uikitml
│   ├── xp.uikitml
│   ├── tournament.uikitml
│   ├── challenge.uikitml
│   └── bossintro.uikitml
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Development

```bash
npm install
npm run dev          # Start dev server with hot reload
npm run build        # Production build to dist/
npx tsc --noEmit     # Type check
```

## License

MIT
