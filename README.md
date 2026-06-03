# 🫧 Neon Bubble VR

**Holodeck Puzzle Bobble / Bubble Shooter** — Built with IWSDK 0.4.1

A complete bubble shooter game for VR and browser featuring 14 game modes, 155 achievements, a 50-level campaign with boss battles, and a fully spatial UI system.

🎮 **[Play Now](https://ellyz2426.github.io/neon-bubble/)**

---

## Features

### 🎯 Core Gameplay
- **Hex grid bubble physics** with odd/even row offsets
- **Match-3+ color mechanics** with BFS cluster detection
- **Cascade system** — disconnected bubbles fall automatically
- **4 power-ups:** 💣 Bomb, 🌈 Rainbow, ⚡ Lightning, 🔥 Fire
- **3 special bubble types:** ❄ Frozen (2 hits), 🪨 Stone (indestructible), ☠ Poison (spreads on miss)
- **Aim guide** with wall bounce prediction
- **Combo system** (x1–x10) with 3-second decay

### 🕹️ 14 Game Modes
| Mode | Description |
|------|-------------|
| **Campaign** | 50 levels across 5 zones with progressive difficulty |
| **Endless** | Wave-based survival with increasing difficulty |
| **Time Attack** | 90 seconds to score as high as possible |
| **Precision** | Limited shots — make every one count |
| **Daily Challenge** | Same puzzle for everyone, changes daily |
| **Weekly Challenge** | Rotating weekly seed with special bubbles |
| **Zen** | No pressure, no game over — just pop |
| **Practice** | Free play to learn mechanics |
| **Tournament** | 8-player bracket elimination vs ghost AI |
| **Challenge Creator** | Customize rows, colors, density, share seed codes |
| **Puzzle** | 12 hand-crafted levels with limited shots |
| **Boss Rush** | Fight all 8 bosses back-to-back |
| **Tutorial** | 5-step interactive guide for new players |

### 👹 Boss Battles
8 unique bosses with special mechanics:
- **Frost Sentinel** — Ice armor + stone obstacles
- **Toxic Swarm** — Poison spread + regeneration
- **Iron Fortress** — Heavy frozen/stone defense
- **Chaos Engine** — All specials combined
- **Neon Overlord** — Max specials, fast regen
- **Void Titan** — Extreme density, rapid regen
- **Quantum Hydra** — Split formations, max poison
- **Final Boss** — Everything maxed, 5s regen

### 📈 Progression Systems
- **XP / Level System** — 50 levels with skin/theme unlock rewards
- **Daily Streak** — Up to +50% XP bonus at 30 days
- **Season / Prestige** — Bronze → Silver → Gold → Diamond tiers
- **Star Ratings** — 1–3 stars per campaign level
- **Achievement System** — 155 achievements across 20+ categories
- **Codex Bestiary** — 22-entry auto-discovery encyclopedia

### 🎨 Customization
- **14 bubble skins** with unique glow/wireframe styles
- **7 arena themes** — Neon Holodeck, Crimson Arcade, Toxic Neon, Ultra Violet, Solar Blaze, Cyber City, Deep Ocean
- **6 trail styles** — Classic, Flame, Electric, Frost, Rainbow, Prismatic
- **Color-blind mode** — Deuteranopia-friendly palette

### 🏆 Player Profile
- **Rank system** — Rookie → Adept → Expert → Master → Legend → Mythical
- **6 badges** — Veteran, Boss Slayer, Champion, Centurion, Max Level, Diamond
- **Per-mode best scores** tracking
- **Career statistics** with accuracy, combos, cascades

### 🎵 Audio
- **Procedural synthwave soundtrack** with dynamic intensity
- **28+ sound effects** — pops, cascades, power-ups, bosses, achievements
- **Mode-specific music shifts** — darker tone for bosses, lighter for puzzles
- **Rising combo audio** with pitch scaling
- **Volume controls** for master, SFX, and music

### ✨ Visual Effects
- **Bubble entrance animations** — scale bounce on grid spawn
- **Pop animations** — scale up + fade out
- **Cascade falling** — gravity + rotation
- **Ring burst particles** on power-up activation
- **Sparkle effects** on matches and rainbow power-ups
- **Trail particles** behind moving bubbles (6 styles)
- **Victory fireworks** — 5-burst colored cascade
- **Screen shake** on big cascades and explosions
- **Danger zone pulsing** — frequency based on proximity
- **Boss phase effects** — red shift at low HP

### 🥽 Dual Runtime
- **VR:** XR controller support (thumbstick aim, trigger shoot, B pause)
- **Browser:** Mouse aim, click shoot, ESC pause, R rematch
- All UI via IWSDK PanelUI — zero HTML DOM overlays
- 29 `.uikitml` spatial UI templates

---

## Tech Stack

- **IWSDK 0.4.1** — Immersive Web SDK for WebXR + browser
- **TypeScript** — Single-file architecture (`src/index.ts`, ~3,800 lines)
- **PanelUI System** — 29 compiled `.uikitml` templates
- **Web Audio API** — Procedural sound generation
- **localStorage** — Full game state persistence

## Controls

### Browser
- **Mouse move** — Aim launcher
- **Click** — Shoot bubble
- **ESC** — Pause/unpause
- **R** — Rematch (from game over)

### VR (XR Controller)
- **Right thumbstick** — Aim launcher
- **Right trigger** — Shoot bubble
- **B button** — Pause/unpause

---

## Development

```bash
npm install
npm run dev    # Dev server with hot reload
npm run build  # Production build to dist/
```

Built with ❤️ in the Holodeck.
