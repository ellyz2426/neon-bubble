# Neon Bubble VR

A holodeck VR bubble shooter / Puzzle Bobble game built with IWSDK 0.4.1. Aim and shoot colored neon energy orbs upward to match 3+ same-color bubbles. Cascading combos, power-ups, and 7 game modes.

## Play

[**Play Now**](https://ellyz2426.github.io/neon-bubble/)

## Features

- **Hex Grid Bubble Physics**: Bubbles snap to hexagonal grid positions with proper odd/even row offsets
- **Match-3 Mechanics**: Connect 3+ same-color bubbles to pop them with particle effects
- **Cascade System**: Disconnected bubble clusters fall for massive bonus points
- **4 Power-Up Types**: Bomb (area explosion), Rainbow (matches any color), Lightning (clears row), Fire (burns vertical path)
- **7 Game Modes**: Campaign (36 levels/6 zones), Endless, Time Attack (90s), Precision (limited shots), Daily Challenge (seeded), Zen, Practice
- **3 Difficulty Levels**: Easy/Medium/Hard affecting grid density, color count, ceiling drop rate
- **Combo Multiplier**: Consecutive matches build scoring multiplier (x1 to x10)
- **8 Bubble Skins**: Unlockable visual customization with unique glow effects
- **5 Arena Themes**: Neon Holodeck, Crimson Arcade, Toxic Neon, Ultra Violet, Solar Blaze
- **30 Achievements**: localStorage-persisted milestone tracking
- **Career Stats**: Games, scores, accuracy, combos, cascades, power-ups
- **Top 20 Leaderboard**: Per-game score tracking with mode and date
- **Dual Runtime**: Full VR (XR controllers) + browser (mouse/keyboard) support

## Controls

### Browser
| Input | Action |
|-------|--------|
| Mouse Move | Aim launcher |
| Click | Shoot bubble |
| ESC | Pause/Resume |
| R | Rematch (game over) |

### VR
| Input | Action |
|-------|--------|
| Right Thumbstick | Aim launcher |
| Right Trigger | Shoot bubble |
| B Button | Pause/Resume |
| Laser Pointer | Menu interaction |

## UI

All game UI uses IWSDK's PanelUI system (`.uikitml` templates). Zero HTML DOM overlays.

- 16 PanelUI spatial UI templates
- `Follower` for head-locked HUDs (score, combo, next bubble, toast, countdown)
- World-space panels for menus, settings, leaderboards, achievements

## Tech Stack

- **IWSDK 0.4.1** — WebXR framework
- **TypeScript** — Type-safe game logic
- **Vite** — Build tooling with `@iwsdk/vite-plugin-uikitml` for spatial UI compilation
- **Web Audio API** — Procedural SFX (15+ sounds) + ambient synthwave drone
- **Dual Runtime** — `xr: { offer: 'once' }` + `canvasPointerEvents` for VR + browser

## Project Structure

```
neon-bubble/
  src/
    index.ts          — Main game (types, audio, particles, grid logic, UI, game loop)
    vite-env.d.ts     — Type declarations
  ui/
    title.uikitml         — Title screen menu
    modeselect.uikitml    — 7 game mode selection
    difficulty.uikitml    — Easy/Medium/Hard
    hud.uikitml           — Head-following HUD (score, combo, shots, level, time, mode)
    nextbubble.uikitml    — Next bubble color indicator
    pause.uikitml         — Pause menu
    gameover.uikitml      — Game over stats
    levelcomplete.uikitml — Campaign level clear
    leaderboard.uikitml   — Top 10 scores
    achievements.uikitml  — 30 achievement slots
    stats.uikitml         — Career statistics
    settings.uikitml      — Volume + theme controls
    skins.uikitml         — 8 bubble skin selector
    help.uikitml          — Controls + gameplay reference
    toast.uikitml         — Notification toasts
    countdown.uikitml     — 3-2-1-POP!
  index.html
  package.json
  vite.config.ts
  tsconfig.json
```

## Build

```bash
npm install
npm run build
```

## Deploy

```bash
npm run build
PROJECT="$PWD"
cd /tmp && rm -rf gh-pages-deploy && mkdir gh-pages-deploy && cd gh-pages-deploy
git init && cp -R "$PROJECT/dist/." .
git add -A && git commit -m "Deploy"
git push --force "https://github.com/ellyz2426/neon-bubble.git" HEAD:gh-pages
```
