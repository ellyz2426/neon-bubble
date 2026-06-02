// Neon Bubble VR — Holodeck Puzzle Bobble / Bubble Shooter
// IWSDK 0.4.1 | All UI via PanelUI | Zero HTML DOM

import {
  World,
  PanelUI,
  Follower,
  FollowBehavior,
  ScreenSpace,
  PanelDocument,
  type UIKitDocument,
  Mesh,
  Group,
  SphereGeometry,
  CylinderGeometry,
  PlaneGeometry,
  BoxGeometry,
  TorusGeometry,
  ConeGeometry,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Color,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  AdditiveBlending,
  AmbientLight,
  PointLight,
  DirectionalLight,
  Fog,
  Line,
  Raycaster,
  Vector2,
} from '@iwsdk/core';

// ─── TYPES & CONSTANTS ────────────────────────────────────────────
type GameState = 'title' | 'modeselect' | 'difficulty' | 'playing' | 'paused' | 'gameover' |
  'leaderboard' | 'achievements' | 'settings' | 'help' | 'stats' | 'skins' | 'countdown' | 'levelcomplete';
type GameMode = 'campaign' | 'endless' | 'timeattack' | 'precision' | 'daily' | 'zen' | 'practice';
type BubbleColor = 0 | 1 | 2 | 3 | 4 | 5; // 6 colors
type Difficulty = 'easy' | 'medium' | 'hard';

interface GridBubble {
  row: number;
  col: number;
  color: BubbleColor;
  mesh: Mesh;
  glow: Mesh;
  wireframe: LineSegments;
  isPowerUp?: 'bomb' | 'rainbow' | 'lightning' | 'fire';
}

interface ShotBubble {
  mesh: Mesh;
  glow: Mesh;
  wireframe: LineSegments;
  color: BubbleColor;
  vx: number;
  vy: number;
  x: number;
  y: number;
  isPowerUp?: 'bomb' | 'rainbow' | 'lightning' | 'fire';
}

const BUBBLE_COLORS: { name: string; hex: string; r: number; g: number; b: number }[] = [
  { name: 'CYAN', hex: '#00ffff', r: 0, g: 1, b: 1 },
  { name: 'MAGENTA', hex: '#ff00ff', r: 1, g: 0, b: 1 },
  { name: 'GREEN', hex: '#00ff80', r: 0, g: 1, b: 0.5 },
  { name: 'ORANGE', hex: '#ff8800', r: 1, g: 0.53, b: 0 },
  { name: 'PURPLE', hex: '#aa44ff', r: 0.67, g: 0.27, b: 1 },
  { name: 'RED', hex: '#ff4444', r: 1, g: 0.27, b: 0.27 },
];

const BUBBLE_RADIUS = 0.06;
const GRID_SPACING = BUBBLE_RADIUS * 2.05;
const PLAYFIELD_WIDTH = 1.6;
const PLAYFIELD_HEIGHT = 2.0;
const PLAYFIELD_LEFT = -PLAYFIELD_WIDTH / 2;
const PLAYFIELD_RIGHT = PLAYFIELD_WIDTH / 2;
const PLAYFIELD_TOP = 1.8;
const PLAYFIELD_BOTTOM = -0.2;
const LAUNCHER_Y = PLAYFIELD_BOTTOM - 0.1;
const DANGER_Y = PLAYFIELD_BOTTOM + 0.15;
const MAX_COLS = Math.floor(PLAYFIELD_WIDTH / GRID_SPACING);
const SHOT_SPEED = 3.5;
const CEILING_DROP_AMOUNT = GRID_SPACING * 0.5;

// ─── THEMES ───────────────────────────────────────────────────────
interface Theme {
  name: string;
  grid: string; accent: string; bg: string; fog: string;
  bubbleGlow: number; wallColor: string;
}

const THEMES: Theme[] = [
  { name: 'Neon Holodeck', grid: '#00ffff', accent: '#ff00ff', bg: '#000811', fog: '#000811', bubbleGlow: 1.2, wallColor: '#004444' },
  { name: 'Crimson Arcade', grid: '#ff4444', accent: '#ffaa00', bg: '#0a0000', fog: '#0a0000', bubbleGlow: 1.0, wallColor: '#440000' },
  { name: 'Toxic Neon', grid: '#00ff80', accent: '#ff00ff', bg: '#000a04', fog: '#000a04', bubbleGlow: 1.1, wallColor: '#004400' },
  { name: 'Ultra Violet', grid: '#aa44ff', accent: '#00ffff', bg: '#050010', fog: '#050010', bubbleGlow: 1.3, wallColor: '#220044' },
  { name: 'Solar Blaze', grid: '#ff8800', accent: '#ffff00', bg: '#0a0400', fog: '#0a0400', bubbleGlow: 1.0, wallColor: '#442200' },
];

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────
interface Achievement { id: string; name: string; desc: string; }
const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_pop', name: 'First Pop', desc: 'Pop your first bubble cluster' },
  { id: 'ten_pops', name: 'Pop Star', desc: 'Pop 10 clusters total' },
  { id: 'fifty_pops', name: 'Bubble Buster', desc: 'Pop 50 clusters total' },
  { id: 'hundred_pops', name: 'Pop Master', desc: 'Pop 100 clusters total' },
  { id: 'first_cascade', name: 'Chain Reaction', desc: 'Trigger your first cascade' },
  { id: 'cascade_5', name: 'Cascade King', desc: 'Cascade 5+ bubbles at once' },
  { id: 'cascade_10', name: 'Cascade Legend', desc: 'Cascade 10+ bubbles at once' },
  { id: 'combo_x3', name: 'Triple Combo', desc: 'Reach x3 combo multiplier' },
  { id: 'combo_x5', name: 'Combo Maniac', desc: 'Reach x5 combo multiplier' },
  { id: 'score_1k', name: 'Score 1K', desc: 'Score 1,000+ in one game' },
  { id: 'score_5k', name: 'Score 5K', desc: 'Score 5,000+ in one game' },
  { id: 'score_10k', name: 'Score 10K', desc: 'Score 10,000+ in one game' },
  { id: 'score_25k', name: 'Score Legend', desc: 'Score 25,000+ in one game' },
  { id: 'bomb_used', name: 'Demolition', desc: 'Use a bomb power-up' },
  { id: 'rainbow_used', name: 'Rainbow Pop', desc: 'Use a rainbow power-up' },
  { id: 'lightning_used', name: 'Lightning Strike', desc: 'Use a lightning power-up' },
  { id: 'fire_used', name: 'Pyromaniac', desc: 'Use a fire power-up' },
  { id: 'clear_board', name: 'Board Wipe', desc: 'Clear all bubbles from the board' },
  { id: 'games_10', name: 'Regular', desc: 'Play 10 games' },
  { id: 'games_50', name: 'Dedicated', desc: 'Play 50 games' },
  { id: 'campaign_1', name: 'Zone 1 Clear', desc: 'Clear Campaign Zone 1' },
  { id: 'campaign_3', name: 'Halfway', desc: 'Clear Campaign Zone 3' },
  { id: 'campaign_6', name: 'Champion', desc: 'Clear all Campaign zones' },
  { id: 'daily_done', name: 'Daily Player', desc: 'Complete a daily challenge' },
  { id: 'accuracy_80', name: 'Sharpshooter', desc: 'Finish a game with 80%+ accuracy' },
  { id: 'accuracy_95', name: 'Sniper', desc: 'Finish a game with 95%+ accuracy' },
  { id: 'no_miss_10', name: 'Perfect 10', desc: '10 consecutive matching shots' },
  { id: 'skin_unlock', name: 'Fashionista', desc: 'Unlock a bubble skin' },
  { id: 'theme_all', name: 'Theme Explorer', desc: 'Try all 5 arena themes' },
  { id: 'powerups_10', name: 'Power Player', desc: 'Use 10 power-ups total' },
];

// ─── BUBBLE SKINS ─────────────────────────────────────────────────
interface BubbleSkin { name: string; multiplier: number; wireColor: string; glowIntensity: number; unlock: string; }
const BUBBLE_SKINS: BubbleSkin[] = [
  { name: 'Classic Neon', multiplier: 1.0, wireColor: '#ffffff', glowIntensity: 1.0, unlock: 'default' },
  { name: 'Solar Flare', multiplier: 1.2, wireColor: '#ff8800', glowIntensity: 1.3, unlock: 'Pop 50 clusters' },
  { name: 'Frost Core', multiplier: 0.8, wireColor: '#88ccff', glowIntensity: 1.5, unlock: 'Score 5K' },
  { name: 'Toxic Pulse', multiplier: 1.1, wireColor: '#00ff44', glowIntensity: 1.2, unlock: 'Play 10 games' },
  { name: 'Plasma Pink', multiplier: 1.0, wireColor: '#ff44aa', glowIntensity: 1.4, unlock: 'x5 combo' },
  { name: 'Void Purple', multiplier: 0.9, wireColor: '#8844ff', glowIntensity: 1.6, unlock: 'Clear a board' },
  { name: 'Chrome', multiplier: 1.0, wireColor: '#cccccc', glowIntensity: 0.8, unlock: '80% accuracy' },
  { name: 'Rainbow', multiplier: 1.3, wireColor: '#ffffff', glowIntensity: 2.0, unlock: 'All campaign zones' },
];

// ─── CAMPAIGN LEVELS ──────────────────────────────────────────────
function generateCampaignLevel(level: number, seed: number): BubbleColor[][] {
  const rng = seededRandom(seed + level * 137);
  const rows = Math.min(5 + Math.floor(level / 6), 10);
  const numColors = Math.min(3 + Math.floor(level / 6), 6) as number;
  const grid: BubbleColor[][] = [];
  for (let r = 0; r < rows; r++) {
    const cols = r % 2 === 0 ? MAX_COLS : MAX_COLS - 1;
    const row: BubbleColor[] = [];
    for (let c = 0; c < cols; c++) {
      if (rng() < 0.15 + level * 0.005) {
        row.push(-1 as BubbleColor); // empty
      } else {
        row.push((Math.floor(rng() * numColors)) as BubbleColor);
      }
    }
    grid.push(row);
  }
  return grid;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

// ─── AUDIO ────────────────────────────────────────────────────────
class AudioManager {
  private ctx: AudioContext | null = null;
  masterVol = 1; sfxVol = 1; musicVol = 1;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicOscs: OscillatorNode[] = [];
  private musicPlaying = false;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
    this.updateVolumes();
  }

  updateVolumes() {
    if (this.masterGain) this.masterGain.gain.value = this.masterVol;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVol;
    if (this.musicGain) this.musicGain.gain.value = this.musicVol * 0.15;
  }

  private playSfx(freq: number, type: OscillatorType, dur: number, vol = 0.3) {
    if (!this.ctx || !this.sfxGain) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  pop() { this.playSfx(880, 'sine', 0.12, 0.4); this.playSfx(1320, 'triangle', 0.08, 0.2); }
  cascade() {
    if (!this.ctx) return;
    [660, 880, 1100, 1320].forEach((f, i) => {
      setTimeout(() => this.playSfx(f, 'sine', 0.15, 0.3), i * 60);
    });
  }
  shoot() { this.playSfx(220, 'sawtooth', 0.1, 0.2); this.playSfx(330, 'triangle', 0.08, 0.15); }
  wallBounce() { this.playSfx(440, 'square', 0.05, 0.15); }
  attach() { this.playSfx(550, 'triangle', 0.08, 0.2); }
  miss() { this.playSfx(150, 'sawtooth', 0.2, 0.25); }
  bomb() { this.playSfx(80, 'sawtooth', 0.4, 0.5); this.playSfx(60, 'square', 0.3, 0.3); }
  lightning() {
    [1100, 1650, 2200].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sawtooth', 0.1, 0.3), i * 40));
  }
  fire() { this.playSfx(200, 'sawtooth', 0.3, 0.3); }
  rainbow() { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.2, 0.25), i * 80)); }
  levelComplete() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.playSfx(f, 'triangle', 0.3, 0.35), i * 100)); }
  gameOver() { [440, 349, 294, 220].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sawtooth', 0.3, 0.3), i * 120)); }
  gameStart() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.15, 0.3), i * 80)); }
  countdownTick() { this.playSfx(660, 'sine', 0.08, 0.25); }
  countdownGo() { this.playSfx(1047, 'sine', 0.2, 0.4); }
  achievement() { [660, 880, 1100, 1320, 1760].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.2, 0.3), i * 70)); }
  buttonClick() { this.playSfx(880, 'sine', 0.05, 0.15); this.playSfx(1100, 'sine', 0.03, 0.1); }
  combo() { this.playSfx(1100, 'triangle', 0.1, 0.3); }

  startMusic() {
    if (!this.ctx || !this.musicGain || this.musicPlaying) return;
    this.musicPlaying = true;
    // Ambient drone
    const bass = this.ctx.createOscillator();
    bass.type = 'sine'; bass.frequency.value = 55;
    const bassGain = this.ctx.createGain(); bassGain.gain.value = 0.4;
    bass.connect(bassGain); bassGain.connect(this.musicGain);
    bass.start();
    const pad = this.ctx.createOscillator();
    pad.type = 'triangle'; pad.frequency.value = 82.5;
    const padFilter = this.ctx.createBiquadFilter();
    padFilter.type = 'lowpass'; padFilter.frequency.value = 400;
    const padGain = this.ctx.createGain(); padGain.gain.value = 0.2;
    pad.connect(padFilter); padFilter.connect(padGain); padGain.connect(this.musicGain);
    pad.start();
    // LFO
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 0.15;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 8;
    lfo.connect(lfoGain); lfoGain.connect(padFilter.frequency);
    lfo.start();
    this.musicOscs = [bass, pad, lfo];
  }

  stopMusic() {
    this.musicOscs.forEach(o => { try { o.stop(); } catch {} });
    this.musicOscs = [];
    this.musicPlaying = false;
  }
}

// ─── PARTICLE SYSTEM ──────────────────────────────────────────────
interface Particle { mesh: Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number; }

class ParticleSystem {
  particles: Particle[] = [];
  private pool: Mesh[] = [];
  private scene: any;
  private maxParticles = 120;

  constructor(scene: any) { this.scene = scene; }

  burst(x: number, y: number, z: number, color: Color, count: number) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      let mesh: Mesh;
      if (this.pool.length > 0) {
        mesh = this.pool.pop()!;
        (mesh.material as MeshBasicMaterial).color.copy(color);
        mesh.visible = true;
      } else {
        const geo = new SphereGeometry(0.012, 4, 4);
        const mat = new MeshBasicMaterial({ color, transparent: true, blending: AdditiveBlending });
        mesh = new Mesh(geo, mat);
        this.scene.add(mesh);
      }
      mesh.position.set(x, y, z);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      this.particles.push({
        mesh, vx: Math.cos(angle) * speed * 0.3, vy: Math.sin(angle) * speed * 0.5 + 0.5,
        vz: (Math.random() - 0.5) * 0.3, life: 1, maxLife: 0.6 + Math.random() * 0.6,
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt / p.maxLife;
      p.vy -= 2 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      (p.mesh.material as MeshBasicMaterial).opacity = Math.max(0, p.life);
      const s = 0.5 + p.life * 0.5;
      p.mesh.scale.setScalar(s);
      if (p.life <= 0) {
        p.mesh.visible = false;
        this.pool.push(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }
}

// ─── MAIN GAME ────────────────────────────────────────────────────
async function main() {
  const container = document.getElementById('app') as HTMLDivElement;
  const world = await World.create(container, {
    xr: { offer: 'once' as any },
    input: { canvasPointerEvents: true },
    features: { grabbing: false, locomotion: false, physics: false, spatialUI: true },
    render: { near: 0.01, far: 100, camera: { position: [0, 0.9, 2.5], lookAt: [0, 0.85, 0] } },
  } as any);

  const audio = new AudioManager();
  const particles = new ParticleSystem(world.scene);

  // ─── STATE ────────────────────────────────────────────────
  let gameState: GameState = 'title';
  let gameMode: GameMode = 'campaign';
  let difficulty: Difficulty = 'medium';
  let themeIndex = 0;
  let skinIndex = 0;
  let campaignLevel = 0;

  // Game vars
  let grid: GridBubble[] = [];
  let shotBubble: ShotBubble | null = null;
  let nextColor: BubbleColor = 0;
  let launcherAngle = 0; // radians from vertical
  let score = 0;
  let combo = 1;
  let comboTimer = 0;
  let shotsFired = 0;
  let bubblesPopped = 0;
  let cascadeCount = 0;
  let matchingShots = 0;
  let consecutiveMatches = 0;
  let bestCombo = 1;
  let timeLeft = 0;
  let shotsLeft = 0;
  let ceilingOffset = 0;
  let missCount = 0;
  let gameActive = false;
  let countdownValue = 3;
  let countdownTimer = 0;

  // Persistence
  const storage = {
    get(key: string, def: any) { try { const v = localStorage.getItem('nb_' + key); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(key: string, val: any) { try { localStorage.setItem('nb_' + key, JSON.stringify(val)); } catch {} },
  };

  let stats = storage.get('stats', {
    games: 0, totalScore: 0, bestScore: 0, totalPopped: 0, totalShots: 0,
    bestCombo: 1, totalCascades: 0, powerUpsUsed: 0, levelsCleared: 0, totalPops: 0,
  });
  let unlockedAchievements: string[] = storage.get('achievements', []);
  let leaderboard: { score: number; mode: string; date: string }[] = storage.get('leaderboard', []);
  let unlockedSkins: number[] = storage.get('skins', [0]);
  let usedThemes: number[] = storage.get('usedThemes', []);

  function saveStats() { storage.set('stats', stats); }
  function saveAchievements() { storage.set('achievements', unlockedAchievements); }
  function saveLeaderboard() { storage.set('leaderboard', leaderboard); }

  function unlockAchievement(id: string) {
    if (unlockedAchievements.includes(id)) return;
    unlockedAchievements.push(id);
    saveAchievements();
    audio.achievement();
    showToast('ACHIEVEMENT: ' + ACHIEVEMENTS.find(a => a.id === id)?.name);
  }

  function checkSkinUnlocks() {
    if (!unlockedSkins.includes(1) && stats.totalPops >= 50) { unlockedSkins.push(1); storage.set('skins', unlockedSkins); unlockAchievement('skin_unlock'); }
    if (!unlockedSkins.includes(2) && stats.bestScore >= 5000) { unlockedSkins.push(2); storage.set('skins', unlockedSkins); }
    if (!unlockedSkins.includes(3) && stats.games >= 10) { unlockedSkins.push(3); storage.set('skins', unlockedSkins); }
    if (!unlockedSkins.includes(4) && stats.bestCombo >= 5) { unlockedSkins.push(4); storage.set('skins', unlockedSkins); }
    if (!unlockedSkins.includes(6) && stats.totalShots > 0 && stats.totalPopped / stats.totalShots >= 0.8) { unlockedSkins.push(6); storage.set('skins', unlockedSkins); }
    if (!unlockedSkins.includes(7) && stats.levelsCleared >= 36) { unlockedSkins.push(7); storage.set('skins', unlockedSkins); }
  }

  // ─── ENVIRONMENT ──────────────────────────────────────────
  function applyTheme() {
    const t = THEMES[themeIndex];
    world.scene.fog = new Fog(new Color(t.fog), 5, 25);
    world.scene.background = new Color(t.bg);
    if (!usedThemes.includes(themeIndex)) {
      usedThemes.push(themeIndex);
      storage.set('usedThemes', usedThemes);
      if (usedThemes.length >= 5) unlockAchievement('theme_all');
    }
  }

  // Lighting
  const ambientLight = new AmbientLight(0x222244, 0.5);
  world.scene.add(ambientLight);
  const mainLight = new DirectionalLight(0x00ffff, 0.6);
  mainLight.position.set(2, 4, 3);
  world.scene.add(mainLight);
  const accentLight1 = new PointLight(0x00ffff, 1, 10);
  accentLight1.position.set(-1.5, 2, 1);
  world.scene.add(accentLight1);
  const accentLight2 = new PointLight(0xff00ff, 0.8, 10);
  accentLight2.position.set(1.5, 0.5, 1);
  world.scene.add(accentLight2);

  // Grid floor
  function createGridFloor() {
    const size = 20;
    const divisions = 20;
    const gridGroup = new Group();
    const gridMat = new LineBasicMaterial({ color: THEMES[themeIndex].grid, transparent: true, opacity: 0.15 });
    for (let i = -divisions / 2; i <= divisions / 2; i++) {
      const pos = (i / divisions) * size;
      // X lines
      const geoX = new BufferGeometry();
      geoX.setAttribute('position', new Float32BufferAttribute([-size / 2, 0, pos, size / 2, 0, pos], 3));
      gridGroup.add(new Line(geoX, gridMat));
      // Z lines
      const geoZ = new BufferGeometry();
      geoZ.setAttribute('position', new Float32BufferAttribute([pos, 0, -size / 2, pos, 0, size / 2], 3));
      gridGroup.add(new Line(geoZ, gridMat));
    }
    gridGroup.position.y = -0.5;
    world.scene.add(gridGroup);
    // Ceiling grid
    const ceilGroup = gridGroup.clone();
    ceilGroup.position.y = 3.5;
    world.scene.add(ceilGroup);
  }
  createGridFloor();

  // Floating decorations
  const decorations: { mesh: Mesh; rotSpeed: number; bobSpeed: number; bobAmp: number; baseY: number }[] = [];
  function createDecorations() {
    const geos = [
      new TorusGeometry(0.15, 0.04, 8, 12),
      new BoxGeometry(0.2, 0.2, 0.2),
      new SphereGeometry(0.12, 8, 8),
      new ConeGeometry(0.1, 0.2, 6),
    ];
    for (let i = 0; i < 14; i++) {
      const geo = geos[i % geos.length];
      const edges = new EdgesGeometry(geo);
      const mat = new LineBasicMaterial({ color: i % 2 === 0 ? THEMES[themeIndex].grid : THEMES[themeIndex].accent, transparent: true, opacity: 0.3 });
      const mesh = new Mesh(geo, new MeshBasicMaterial({ visible: false }));
      const wire = new LineSegments(edges, mat);
      mesh.add(wire);
      mesh.position.set((Math.random() - 0.5) * 6, 0.5 + Math.random() * 2.5, -2 - Math.random() * 5);
      world.scene.add(mesh);
      decorations.push({ mesh, rotSpeed: 0.2 + Math.random() * 0.5, bobSpeed: 0.3 + Math.random() * 0.4, bobAmp: 0.1 + Math.random() * 0.15, baseY: mesh.position.y });
    }
  }
  createDecorations();

  // Ambient particles
  const ambientParticles: { mesh: Mesh; baseY: number; driftX: number; driftZ: number; pulseSpeed: number }[] = [];
  function createAmbientParticles() {
    for (let i = 0; i < 40; i++) {
      const geo = new SphereGeometry(0.008, 4, 4);
      const mat = new MeshBasicMaterial({ color: THEMES[themeIndex].grid, transparent: true, opacity: 0.3, blending: AdditiveBlending });
      const mesh = new Mesh(geo, mat);
      mesh.position.set((Math.random() - 0.5) * 8, Math.random() * 3.5, -1 - Math.random() * 6);
      world.scene.add(mesh);
      ambientParticles.push({ mesh, baseY: mesh.position.y, driftX: (Math.random() - 0.5) * 0.05, driftZ: (Math.random() - 0.5) * 0.03, pulseSpeed: 0.5 + Math.random() * 1 });
    }
  }
  createAmbientParticles();

  // ─── PLAYFIELD WALLS ──────────────────────────────────────
  const wallGroup = new Group();
  function createWalls() {
    const wallMat = new MeshStandardMaterial({ color: THEMES[themeIndex].wallColor, emissive: THEMES[themeIndex].grid, emissiveIntensity: 0.3, transparent: true, opacity: 0.3 });
    const wallEdgeMat = new LineBasicMaterial({ color: THEMES[themeIndex].grid, transparent: true, opacity: 0.6 });
    const wallHeight = PLAYFIELD_HEIGHT + 0.5;
    const wallGeo = new BoxGeometry(0.02, wallHeight, 0.02);
    // Left wall
    const lw = new Mesh(wallGeo, wallMat);
    lw.position.set(PLAYFIELD_LEFT - 0.01, PLAYFIELD_BOTTOM + wallHeight / 2, 0);
    lw.add(new LineSegments(new EdgesGeometry(wallGeo), wallEdgeMat));
    wallGroup.add(lw);
    // Right wall
    const rw = new Mesh(wallGeo, wallMat);
    rw.position.set(PLAYFIELD_RIGHT + 0.01, PLAYFIELD_BOTTOM + wallHeight / 2, 0);
    rw.add(new LineSegments(new EdgesGeometry(wallGeo), wallEdgeMat));
    wallGroup.add(rw);
    // Ceiling bar
    const ceilGeo = new BoxGeometry(PLAYFIELD_WIDTH + 0.04, 0.02, 0.02);
    const ceil = new Mesh(ceilGeo, wallMat);
    ceil.position.set(0, PLAYFIELD_TOP + 0.01, 0);
    ceil.add(new LineSegments(new EdgesGeometry(ceilGeo), wallEdgeMat));
    wallGroup.add(ceil);
    // Danger line
    const dangerGeo = new BoxGeometry(PLAYFIELD_WIDTH, 0.005, 0.005);
    const dangerMat = new MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.5 });
    const danger = new Mesh(dangerGeo, dangerMat);
    danger.position.set(0, DANGER_Y, 0);
    wallGroup.add(danger);
    world.scene.add(wallGroup);
  }
  createWalls();

  // ─── LAUNCHER ─────────────────────────────────────────────
  const launcherGroup = new Group();
  const launcherBase = new Mesh(
    new CylinderGeometry(0.08, 0.1, 0.06, 12),
    new MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.4 })
  );
  launcherBase.add(new LineSegments(new EdgesGeometry(new CylinderGeometry(0.08, 0.1, 0.06, 12)), new LineBasicMaterial({ color: 0x00ffff })));
  launcherGroup.add(launcherBase);

  const launcherBarrel = new Mesh(
    new CylinderGeometry(0.025, 0.03, 0.2, 8),
    new MeshStandardMaterial({ color: 0x004444, emissive: 0x00ffff, emissiveIntensity: 0.3 })
  );
  launcherBarrel.position.y = 0.13;
  launcherBarrel.add(new LineSegments(new EdgesGeometry(new CylinderGeometry(0.025, 0.03, 0.2, 8)), new LineBasicMaterial({ color: 0x00ffff })));
  launcherGroup.add(launcherBarrel);

  // Glow orb at barrel tip
  const launcherGlow = new Mesh(
    new SphereGeometry(0.035, 8, 8),
    new MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5, blending: AdditiveBlending })
  );
  launcherGlow.position.y = 0.24;
  launcherGroup.add(launcherGlow);

  launcherGroup.position.set(0, LAUNCHER_Y, 0);
  world.scene.add(launcherGroup);

  // Aim guide line
  const aimLineMat = new LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 });
  const aimLineGeo = new BufferGeometry();
  const aimLinePositions = new Float32Array(30 * 3); // up to 30 segments for bounces
  aimLineGeo.setAttribute('position', new Float32BufferAttribute(aimLinePositions, 3));
  const aimLine = new Line(aimLineGeo, aimLineMat);
  aimLine.frustumCulled = false;
  world.scene.add(aimLine);

  // Next bubble preview visual
  let nextBubblePreview: Mesh | null = null;
  function updateNextBubblePreview() {
    if (nextBubblePreview) world.scene.remove(nextBubblePreview);
    const c = BUBBLE_COLORS[nextColor];
    const geo = new SphereGeometry(BUBBLE_RADIUS * 0.7, 12, 12);
    const mat = new MeshStandardMaterial({ color: new Color(c.r, c.g, c.b), emissive: new Color(c.r, c.g, c.b), emissiveIntensity: 0.5 });
    nextBubblePreview = new Mesh(geo, mat);
    nextBubblePreview.position.set(-0.15, LAUNCHER_Y, 0);
    world.scene.add(nextBubblePreview);
  }

  // ─── BUBBLE CREATION ──────────────────────────────────────
  function createBubbleMesh(color: BubbleColor, x: number, y: number, powerUp?: string): { mesh: Mesh; glow: Mesh; wireframe: LineSegments } {
    const c = BUBBLE_COLORS[color] || BUBBLE_COLORS[0];
    const geo = new SphereGeometry(BUBBLE_RADIUS, 12, 12);
    const mat = new MeshStandardMaterial({
      color: new Color(c.r, c.g, c.b),
      emissive: new Color(c.r, c.g, c.b),
      emissiveIntensity: 0.4,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(x, y, 0);

    // Wireframe
    const edges = new EdgesGeometry(geo);
    const wireMat = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const wireframe = new LineSegments(edges, wireMat);
    mesh.add(wireframe);

    // Glow
    const glowGeo = new SphereGeometry(BUBBLE_RADIUS * 1.8, 8, 8);
    const glowMat = new MeshBasicMaterial({
      color: new Color(c.r, c.g, c.b), transparent: true, opacity: 0.15, blending: AdditiveBlending
    });
    const glow = new Mesh(glowGeo, glowMat);
    mesh.add(glow);

    // Power-up visual
    if (powerUp) {
      let pColor = 0xffffff;
      if (powerUp === 'bomb') pColor = 0xff0000;
      if (powerUp === 'rainbow') pColor = 0xffffff;
      if (powerUp === 'lightning') pColor = 0x4488ff;
      if (powerUp === 'fire') pColor = 0xff4400;
      const ring = new Mesh(
        new TorusGeometry(BUBBLE_RADIUS * 1.2, 0.005, 6, 12),
        new MeshBasicMaterial({ color: pColor, transparent: true, opacity: 0.8, blending: AdditiveBlending })
      );
      mesh.add(ring);
    }

    world.scene.add(mesh);
    return { mesh, glow, wireframe };
  }

  function gridToWorld(row: number, col: number): { x: number; y: number } {
    const isOddRow = row % 2 !== 0;
    const xOffset = isOddRow ? GRID_SPACING / 2 : 0;
    const x = PLAYFIELD_LEFT + GRID_SPACING / 2 + col * GRID_SPACING + xOffset;
    const y = PLAYFIELD_TOP - GRID_SPACING / 2 - row * GRID_SPACING * 0.866 - ceilingOffset;
    return { x, y };
  }

  function addGridBubble(row: number, col: number, color: BubbleColor, powerUp?: string): GridBubble | null {
    if (color === -1 as any) return null;
    const { x, y } = gridToWorld(row, col);
    const { mesh, glow, wireframe } = createBubbleMesh(color, x, y, powerUp);
    const bubble: GridBubble = { row, col, color, mesh, glow, wireframe, isPowerUp: powerUp as any };
    grid.push(bubble);
    return bubble;
  }

  function removeGridBubble(bubble: GridBubble) {
    world.scene.remove(bubble.mesh);
    const idx = grid.indexOf(bubble);
    if (idx >= 0) grid.splice(idx, 1);
  }

  function clearGrid() {
    for (const b of grid) world.scene.remove(b.mesh);
    grid = [];
  }

  // ─── GRID LOGIC ───────────────────────────────────────────
  function getNeighbors(row: number, col: number): GridBubble[] {
    const isOddRow = row % 2 !== 0;
    const offsets = isOddRow
      ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
      : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
    const neighbors: GridBubble[] = [];
    for (const [dr, dc] of offsets) {
      const nr = row + dr;
      const nc = col + dc;
      const b = grid.find(g => g.row === nr && g.col === nc);
      if (b) neighbors.push(b);
    }
    return neighbors;
  }

  function findCluster(bubble: GridBubble): GridBubble[] {
    const cluster: GridBubble[] = [bubble];
    const visited = new Set<string>();
    visited.add(`${bubble.row},${bubble.col}`);
    const queue = [bubble];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = getNeighbors(current.row, current.col);
      for (const n of neighbors) {
        const key = `${n.row},${n.col}`;
        if (!visited.has(key) && n.color === bubble.color) {
          visited.add(key);
          cluster.push(n);
          queue.push(n);
        }
      }
    }
    return cluster;
  }

  function findDisconnected(): GridBubble[] {
    // BFS from top row to find connected
    const connected = new Set<string>();
    const queue: GridBubble[] = [];
    for (const b of grid) {
      if (b.row === 0) {
        connected.add(`${b.row},${b.col}`);
        queue.push(b);
      }
    }
    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = getNeighbors(current.row, current.col);
      for (const n of neighbors) {
        const key = `${n.row},${n.col}`;
        if (!connected.has(key)) {
          connected.add(key);
          queue.push(n);
        }
      }
    }
    return grid.filter(b => !connected.has(`${b.row},${b.col}`));
  }

  function findNearestGridPos(x: number, y: number): { row: number; col: number } {
    let bestRow = 0, bestCol = 0, bestDist = Infinity;
    for (let r = 0; r < 25; r++) {
      const maxCols = r % 2 === 0 ? MAX_COLS : MAX_COLS - 1;
      for (let c = 0; c < maxCols; c++) {
        const pos = gridToWorld(r, c);
        const dist = Math.hypot(pos.x - x, pos.y - y);
        if (dist < bestDist && !grid.find(g => g.row === r && g.col === c)) {
          bestDist = dist;
          bestRow = r;
          bestCol = c;
        }
      }
    }
    return { row: bestRow, col: bestCol };
  }

  // ─── POWER-UP EFFECTS ────────────────────────────────────
  function executePowerUp(type: string, row: number, col: number) {
    stats.powerUpsUsed++;
    if (type === 'bomb') {
      audio.bomb();
      unlockAchievement('bomb_used');
      const center = gridToWorld(row, col);
      const radius = GRID_SPACING * 3;
      const toRemove = grid.filter(b => {
        const bpos = gridToWorld(b.row, b.col);
        return Math.hypot(bpos.x - center.x, bpos.y - center.y) < radius;
      });
      for (const b of toRemove) {
        particles.burst(b.mesh.position.x, b.mesh.position.y, 0, new Color(1, 0.3, 0), 8);
        removeGridBubble(b);
        bubblesPopped++;
        score += 50 * combo;
      }
    } else if (type === 'rainbow') {
      audio.rainbow();
      unlockAchievement('rainbow_used');
      // Rainbow matches ANY color — find largest adjacent cluster
      let bestCluster: GridBubble[] = [];
      const neighbors = getNeighbors(row, col);
      for (const n of neighbors) {
        const cluster = findCluster(n);
        if (cluster.length > bestCluster.length) bestCluster = cluster;
      }
      for (const b of bestCluster) {
        particles.burst(b.mesh.position.x, b.mesh.position.y, 0, new Color(1, 1, 1), 6);
        removeGridBubble(b);
        bubblesPopped++;
        score += 100 * combo;
      }
    } else if (type === 'lightning') {
      audio.lightning();
      unlockAchievement('lightning_used');
      // Clear entire row
      const toRemove = grid.filter(b => b.row === row);
      for (const b of toRemove) {
        particles.burst(b.mesh.position.x, b.mesh.position.y, 0, new Color(0.3, 0.5, 1), 6);
        removeGridBubble(b);
        bubblesPopped++;
        score += 75 * combo;
      }
    } else if (type === 'fire') {
      audio.fire();
      unlockAchievement('fire_used');
      // Burns through path vertically upward
      const center = gridToWorld(row, col);
      const toRemove = grid.filter(b => {
        const bpos = gridToWorld(b.row, b.col);
        return Math.abs(bpos.x - center.x) < GRID_SPACING && b.row <= row;
      });
      for (const b of toRemove) {
        particles.burst(b.mesh.position.x, b.mesh.position.y, 0, new Color(1, 0.5, 0), 6);
        removeGridBubble(b);
        bubblesPopped++;
        score += 60 * combo;
      }
    }
  }

  // ─── SHOT HANDLING ────────────────────────────────────────
  function shootBubble() {
    if (shotBubble || !gameActive) return;
    audio.init();
    audio.shoot();
    shotsFired++;

    const angle = launcherAngle;
    const startX = launcherGroup.position.x;
    const startY = launcherGroup.position.y + 0.24;
    const vx = Math.sin(angle) * SHOT_SPEED;
    const vy = Math.cos(angle) * SHOT_SPEED;

    // Determine if this shot is a power-up (rare chance)
    let powerUp: string | undefined;
    if (Math.random() < 0.08 && gameMode !== 'zen' && gameMode !== 'practice') {
      const types = ['bomb', 'rainbow', 'lightning', 'fire'];
      powerUp = types[Math.floor(Math.random() * types.length)];
    }

    const color = powerUp ? 0 as BubbleColor : nextColor;
    const { mesh, glow, wireframe } = createBubbleMesh(color, startX, startY, powerUp);
    shotBubble = { mesh, glow, wireframe, color, vx, vy, x: startX, y: startY, isPowerUp: powerUp as any };

    // Pick next color from colors present in grid
    const colorsInGrid = [...new Set(grid.map(b => b.color))];
    nextColor = colorsInGrid.length > 0 ? colorsInGrid[Math.floor(Math.random() * colorsInGrid.length)] : (Math.floor(Math.random() * 6) as BubbleColor);
    updateNextBubblePreview();
    updateNextBubbleUI();
  }

  function handleShotCollision() {
    if (!shotBubble) return;

    const { row, col } = findNearestGridPos(shotBubble.x, shotBubble.y);
    const pos = gridToWorld(row, col);

    // Handle power-up
    if (shotBubble.isPowerUp) {
      executePowerUp(shotBubble.isPowerUp, row, col);
      world.scene.remove(shotBubble.mesh);
      shotBubble = null;
      handleCascades();
      return;
    }

    // Place bubble in grid
    const placed = addGridBubble(row, col, shotBubble.color);
    world.scene.remove(shotBubble.mesh);
    shotBubble = null;

    if (!placed) return;

    // Check for match
    const cluster = findCluster(placed);
    if (cluster.length >= 3) {
      // Pop!
      audio.pop();
      consecutiveMatches++;
      matchingShots++;
      combo = Math.min(10, 1 + Math.floor(consecutiveMatches / 2));
      if (combo > bestCombo) bestCombo = combo;
      comboTimer = 3;

      if (combo >= 3) unlockAchievement('combo_x3');
      if (combo >= 5) unlockAchievement('combo_x5');
      if (consecutiveMatches >= 10) unlockAchievement('no_miss_10');

      for (const b of cluster) {
        const c = BUBBLE_COLORS[b.color];
        particles.burst(b.mesh.position.x, b.mesh.position.y, 0, new Color(c.r, c.g, c.b), 10);
        removeGridBubble(b);
        bubblesPopped++;
        score += 100 * combo;
      }
      stats.totalPops++;
      if (stats.totalPops === 1) unlockAchievement('first_pop');
      if (stats.totalPops >= 10) unlockAchievement('ten_pops');
      if (stats.totalPops >= 50) unlockAchievement('fifty_pops');
      if (stats.totalPops >= 100) unlockAchievement('hundred_pops');

      if (combo > 1) {
        audio.combo();
        showToast('COMBO x' + combo + '!');
      }

      // Handle cascades
      handleCascades();

      // Check board clear
      if (grid.length === 0) {
        unlockAchievement('clear_board');
        score += 5000;
        showToast('BOARD CLEAR! +5000');

        if (gameMode === 'campaign') {
          handleLevelComplete();
          return;
        }
        // In endless, regenerate
        if (gameMode === 'endless') {
          ceilingOffset = 0;
          missCount = 0;
          generateGrid();
        }
      }
    } else {
      // No match
      audio.attach();
      consecutiveMatches = 0;
      missCount++;

      // Drop ceiling every 5 misses (adjusted by difficulty)
      const missThreshold = difficulty === 'easy' ? 7 : difficulty === 'medium' ? 5 : 3;
      if (missCount >= missThreshold && gameMode !== 'zen' && gameMode !== 'practice') {
        missCount = 0;
        ceilingOffset += CEILING_DROP_AMOUNT;
        updateGridPositions();

        // Check game over
        const lowestY = Math.min(...grid.map(b => b.mesh.position.y));
        if (lowestY <= DANGER_Y) {
          endGame();
        }
      }
    }
  }

  function handleCascades() {
    const disconnected = findDisconnected();
    if (disconnected.length > 0) {
      audio.cascade();
      cascadeCount++;
      stats.totalCascades++;
      unlockAchievement('first_cascade');
      if (disconnected.length >= 5) unlockAchievement('cascade_5');
      if (disconnected.length >= 10) unlockAchievement('cascade_10');

      showToast('CASCADE! +' + (disconnected.length * 150 * combo));
      for (const b of disconnected) {
        const c = BUBBLE_COLORS[b.color];
        particles.burst(b.mesh.position.x, b.mesh.position.y, 0, new Color(c.r, c.g, c.b), 8);
        removeGridBubble(b);
        bubblesPopped++;
        score += 150 * combo;
      }
    }
  }

  function updateGridPositions() {
    for (const b of grid) {
      const { x, y } = gridToWorld(b.row, b.col);
      b.mesh.position.set(x, y, 0);
    }
  }

  // ─── GAME FLOW ────────────────────────────────────────────
  function generateGrid() {
    clearGrid();
    if (gameMode === 'campaign') {
      const layout = generateCampaignLevel(campaignLevel, 42);
      for (let r = 0; r < layout.length; r++) {
        for (let c = 0; c < layout[r].length; c++) {
          addGridBubble(r, c, layout[r][c]);
        }
      }
    } else if (gameMode === 'daily') {
      const today = new Date();
      const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const layout = generateCampaignLevel(5, daySeed);
      for (let r = 0; r < layout.length; r++) {
        for (let c = 0; c < layout[r].length; c++) {
          addGridBubble(r, c, layout[r][c]);
        }
      }
    } else {
      // Endless, timeattack, precision, zen, practice
      const numColors = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
      const rows = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 7 : 9;
      for (let r = 0; r < rows; r++) {
        const cols = r % 2 === 0 ? MAX_COLS : MAX_COLS - 1;
        for (let c = 0; c < cols; c++) {
          if (Math.random() < 0.12) continue;
          const color = Math.floor(Math.random() * numColors) as BubbleColor;
          addGridBubble(r, c, color);
        }
      }
    }
  }

  function startGame() {
    audio.init();
    audio.startMusic();
    score = 0; combo = 1; comboTimer = 0; shotsFired = 0; bubblesPopped = 0;
    cascadeCount = 0; matchingShots = 0; consecutiveMatches = 0; bestCombo = 1;
    ceilingOffset = 0; missCount = 0; gameActive = true;
    if (shotBubble) { world.scene.remove(shotBubble.mesh); shotBubble = null; }

    // Mode-specific setup
    if (gameMode === 'timeattack') timeLeft = 90;
    else if (gameMode === 'precision') shotsLeft = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 20 : 15;
    else { timeLeft = 0; shotsLeft = 0; }

    const colorsInGrid = grid.length > 0 ? [...new Set(grid.map(b => b.color))] : [0, 1, 2, 3, 4, 5];
    nextColor = (colorsInGrid[Math.floor(Math.random() * colorsInGrid.length)] || 0) as BubbleColor;
    updateNextBubblePreview();
    updateNextBubbleUI();
    audio.gameStart();
  }

  function handleLevelComplete() {
    gameActive = false;
    stats.levelsCleared++;
    const zone = Math.floor(campaignLevel / 6) + 1;
    if (zone >= 1) unlockAchievement('campaign_1');
    if (zone >= 3) unlockAchievement('campaign_3');
    if (zone >= 6) unlockAchievement('campaign_6');

    audio.levelComplete();
    showLevelComplete();
    setGameState('levelcomplete');
  }

  function endGame() {
    gameActive = false;
    audio.stopMusic();
    audio.gameOver();

    stats.games++;
    stats.totalScore += score;
    stats.totalPopped += bubblesPopped;
    stats.totalShots += shotsFired;
    if (score > stats.bestScore) stats.bestScore = score;
    if (bestCombo > stats.bestCombo) stats.bestCombo = bestCombo;
    saveStats();
    checkSkinUnlocks();

    // Score achievements
    if (score >= 1000) unlockAchievement('score_1k');
    if (score >= 5000) unlockAchievement('score_5k');
    if (score >= 10000) unlockAchievement('score_10k');
    if (score >= 25000) unlockAchievement('score_25k');
    if (stats.games >= 10) unlockAchievement('games_10');
    if (stats.games >= 50) unlockAchievement('games_50');
    if (gameMode === 'daily') unlockAchievement('daily_done');
    const accuracy = shotsFired > 0 ? matchingShots / shotsFired : 0;
    if (accuracy >= 0.8 && shotsFired >= 5) unlockAchievement('accuracy_80');
    if (accuracy >= 0.95 && shotsFired >= 10) unlockAchievement('accuracy_95');

    // Leaderboard
    leaderboard.push({ score, mode: gameMode, date: new Date().toLocaleDateString() });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 20);
    saveLeaderboard();

    showGameOver();
    setGameState('gameover');
  }

  // ─── UI MANAGEMENT ────────────────────────────────────────
  const uiEntities: Record<string, any> = {};
  const uiDocs: Record<string, UIKitDocument | null> = {};
  let toastTimer = 0;

  function createUIPanel(id: string, config: string, opts: {
    maxWidth?: number; maxHeight?: number;
    follower?: boolean; screenSpace?: boolean;
    position?: [number, number, number];
    ssOpts?: Record<string, any>;
  }) {
    const entity = world.createTransformEntity(undefined, { persistent: true });
    if (opts.position) entity.object3D!.position.set(...opts.position);
    entity.addComponent(PanelUI, { config, maxWidth: opts.maxWidth || 0.8, maxHeight: opts.maxHeight || 1.0 });

    if (opts.follower) {
      entity.addComponent(Follower, {
        target: (world as any).player?.head,
        offsetPosition: opts.position || [0, 0.1, -0.6],
        behavior: FollowBehavior.PivotY,
        speed: 5,
        tolerance: 0.3,
      });
    }

    if (opts.screenSpace) {
      entity.addComponent(ScreenSpace, {
        width: opts.ssOpts?.width || '50vw',
        height: 'auto',
        ...(opts.ssOpts || {}),
        zOffset: 0.25,
      });
    }

    entity.object3D!.visible = false;
    uiEntities[id] = entity;
    uiDocs[id] = null;
    return entity;
  }

  function getDoc(id: string): UIKitDocument | null {
    if (uiDocs[id]) return uiDocs[id];
    const entity = uiEntities[id];
    if (!entity) return null;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (doc) uiDocs[id] = doc;
    return doc || null;
  }

  function showPanel(id: string) { if (uiEntities[id]) uiEntities[id].object3D!.visible = true; }
  function hidePanel(id: string) { if (uiEntities[id]) uiEntities[id].object3D!.visible = false; }
  function hideAllPanels() { Object.keys(uiEntities).forEach(id => hidePanel(id)); }

  function setText(doc: UIKitDocument | null, id: string, text: string) {
    if (!doc) return;
    const el = doc.getElementById(id);
    if (el && (el as any).text) (el as any).text.value = text;
  }

  function bindClick(doc: UIKitDocument | null, id: string, handler: () => void) {
    if (!doc) return;
    const el = doc.getElementById(id);
    if (el) el.addEventListener('click', () => { audio.buttonClick(); handler(); });
  }

  // Create all panels
  createUIPanel('title', '/ui/title.json', { maxWidth: 0.7, maxHeight: 0.9, position: [0, 1.2, -1.5] });
  createUIPanel('modeselect', '/ui/modeselect.json', { maxWidth: 0.9, maxHeight: 1.0, position: [0, 1.2, -1.5] });
  createUIPanel('difficulty', '/ui/difficulty.json', { maxWidth: 0.5, maxHeight: 0.7, position: [0, 1.2, -1.5] });
  createUIPanel('hud', '/ui/hud.json', { maxWidth: 0.45, maxHeight: 0.1, follower: true, position: [0, 0.2, -0.5] });
  createUIPanel('pause', '/ui/pause.json', { maxWidth: 0.5, maxHeight: 0.5, position: [0, 1.2, -1.2] });
  createUIPanel('gameover', '/ui/gameover.json', { maxWidth: 0.7, maxHeight: 0.8, position: [0, 1.2, -1.5] });
  createUIPanel('leaderboard', '/ui/leaderboard.json', { maxWidth: 0.8, maxHeight: 1.0, position: [0, 1.2, -1.5] });
  createUIPanel('achievements', '/ui/achievements.json', { maxWidth: 0.9, maxHeight: 1.0, position: [0, 1.2, -1.5] });
  createUIPanel('settings', '/ui/settings.json', { maxWidth: 0.7, maxHeight: 0.8, position: [0, 1.2, -1.5] });
  createUIPanel('help', '/ui/help.json', { maxWidth: 0.8, maxHeight: 1.2, position: [0, 1.2, -1.5] });
  createUIPanel('stats', '/ui/stats.json', { maxWidth: 0.6, maxHeight: 0.9, position: [0, 1.2, -1.5] });
  createUIPanel('skins', '/ui/skins.json', { maxWidth: 0.7, maxHeight: 0.7, position: [0, 1.2, -1.5] });
  createUIPanel('toast', '/ui/toast.json', { maxWidth: 0.3, maxHeight: 0.08, follower: true, position: [0, -0.15, -0.5] });
  createUIPanel('countdown', '/ui/countdown.json', { maxWidth: 0.25, maxHeight: 0.25, follower: true, position: [0, 0, -0.6] });
  createUIPanel('levelcomplete', '/ui/levelcomplete.json', { maxWidth: 0.6, maxHeight: 0.6, position: [0, 1.2, -1.5] });
  createUIPanel('nextbubble', '/ui/nextbubble.json', { maxWidth: 0.12, maxHeight: 0.08, follower: true, position: [-0.2, -0.1, -0.5] });

  let uiBindingsReady = false;
  function tryBindUI() {
    if (uiBindingsReady) return;
    const titleDoc = getDoc('title');
    if (!titleDoc) return;
    uiBindingsReady = true;

    // Title
    bindClick(titleDoc, 'btn-play', () => setGameState('modeselect'));
    bindClick(titleDoc, 'btn-scores', () => { showLeaderboard(); setGameState('leaderboard'); });
    bindClick(titleDoc, 'btn-achievements', () => { showAchievements(); setGameState('achievements'); });
    bindClick(titleDoc, 'btn-stats', () => { showStats(); setGameState('stats'); });
    bindClick(titleDoc, 'btn-skins', () => { showSkins(); setGameState('skins'); });
    bindClick(titleDoc, 'btn-settings', () => { showSettings(); setGameState('settings'); });
    bindClick(titleDoc, 'btn-help', () => setGameState('help'));

    // Mode select
    const modeDoc = getDoc('modeselect');
    const modes: [string, GameMode][] = [
      ['btn-campaign', 'campaign'], ['btn-endless', 'endless'], ['btn-timeattack', 'timeattack'],
      ['btn-precision', 'precision'], ['btn-daily', 'daily'], ['btn-zen', 'zen'], ['btn-practice', 'practice'],
    ];
    for (const [btnId, mode] of modes) {
      bindClick(modeDoc, btnId, () => { gameMode = mode; setGameState('difficulty'); });
    }
    bindClick(modeDoc, 'btn-back', () => setGameState('title'));

    // Difficulty
    const diffDoc = getDoc('difficulty');
    const diffs: [string, Difficulty][] = [['btn-easy', 'easy'], ['btn-medium', 'medium'], ['btn-hard', 'hard']];
    for (const [btnId, diff] of diffs) {
      bindClick(diffDoc, btnId, () => { difficulty = diff; startCountdown(); });
    }
    bindClick(diffDoc, 'btn-back', () => setGameState('modeselect'));

    // Pause
    const pauseDoc = getDoc('pause');
    bindClick(pauseDoc, 'btn-resume', () => { setGameState('playing'); gameActive = true; });
    bindClick(pauseDoc, 'btn-quit', () => { gameActive = false; audio.stopMusic(); clearGrid(); setGameState('title'); });

    // Game over
    const goDoc = getDoc('gameover');
    bindClick(goDoc, 'btn-rematch', () => { clearGrid(); generateGrid(); startCountdown(); });
    bindClick(goDoc, 'btn-title', () => { clearGrid(); setGameState('title'); });

    // Leaderboard
    bindClick(getDoc('leaderboard'), 'btn-back', () => setGameState('title'));
    // Achievements
    bindClick(getDoc('achievements'), 'btn-back', () => setGameState('title'));
    // Settings
    bindSettingsButtons();
    bindClick(getDoc('settings'), 'btn-back', () => setGameState('title'));
    // Help
    bindClick(getDoc('help'), 'btn-back', () => setGameState('title'));
    // Stats
    bindClick(getDoc('stats'), 'btn-back', () => setGameState('title'));
    // Skins
    bindSkinsButtons();
    bindClick(getDoc('skins'), 'btn-back', () => setGameState('title'));
    // Level complete
    const lcDoc = getDoc('levelcomplete');
    bindClick(lcDoc, 'btn-next', () => { campaignLevel++; clearGrid(); generateGrid(); startCountdown(); });
    bindClick(lcDoc, 'btn-title', () => { clearGrid(); setGameState('title'); });
  }

  function bindSettingsButtons() {
    const doc = getDoc('settings');
    if (!doc) return;
    const volKeys: [string, 'masterVol' | 'sfxVol' | 'musicVol', string][] = [
      ['master', 'masterVol', 'vol-master'], ['sfx', 'sfxVol', 'vol-sfx'], ['music', 'musicVol', 'vol-music']
    ];
    for (const [prefix, key, valueId] of volKeys) {
      bindClick(doc, `btn-${prefix}-down`, () => {
        audio[key] = Math.max(0, audio[key] - 0.1);
        audio.updateVolumes();
        setText(doc, valueId, Math.round(audio[key] * 100).toString());
      });
      bindClick(doc, `btn-${prefix}-up`, () => {
        audio[key] = Math.min(1, audio[key] + 0.1);
        audio.updateVolumes();
        setText(doc, valueId, Math.round(audio[key] * 100).toString());
      });
    }
    bindClick(doc, 'btn-theme-prev', () => { themeIndex = (themeIndex - 1 + THEMES.length) % THEMES.length; applyTheme(); setText(doc, 'theme-name', THEMES[themeIndex].name); });
    bindClick(doc, 'btn-theme-next', () => { themeIndex = (themeIndex + 1) % THEMES.length; applyTheme(); setText(doc, 'theme-name', THEMES[themeIndex].name); });
  }

  function bindSkinsButtons() {
    const doc = getDoc('skins');
    if (!doc) return;
    for (let i = 0; i < 8; i++) {
      bindClick(doc, `skin-${i}`, () => {
        if (unlockedSkins.includes(i)) { skinIndex = i; showSkins(); }
      });
    }
  }

  function setGameState(state: GameState) {
    gameState = state;
    hideAllPanels();
    launcherGroup.visible = state === 'playing' || state === 'paused' || state === 'countdown';
    aimLine.visible = state === 'playing';
    if (nextBubblePreview) nextBubblePreview.visible = state === 'playing';

    switch (state) {
      case 'title': showPanel('title'); break;
      case 'modeselect': showPanel('modeselect'); break;
      case 'difficulty': showPanel('difficulty'); break;
      case 'playing': showPanel('hud'); showPanel('nextbubble'); break;
      case 'paused': showPanel('pause'); break;
      case 'gameover': showPanel('gameover'); break;
      case 'leaderboard': showPanel('leaderboard'); break;
      case 'achievements': showPanel('achievements'); break;
      case 'settings': showPanel('settings'); break;
      case 'help': showPanel('help'); break;
      case 'stats': showPanel('stats'); break;
      case 'skins': showPanel('skins'); break;
      case 'countdown': showPanel('countdown'); break;
      case 'levelcomplete': showPanel('levelcomplete'); break;
    }
  }

  function startCountdown() {
    generateGrid();
    countdownValue = 3;
    countdownTimer = 0;
    setGameState('countdown');
  }

  function showToast(msg: string) {
    const doc = getDoc('toast');
    setText(doc, 'toast-msg', msg);
    showPanel('toast');
    toastTimer = 2;
  }

  function showGameOver() {
    const doc = getDoc('gameover');
    const accuracy = shotsFired > 0 ? Math.round(matchingShots / shotsFired * 100) : 0;
    setText(doc, 'go-score', score.toString());
    setText(doc, 'go-popped', bubblesPopped.toString());
    setText(doc, 'go-combo', 'x' + bestCombo);
    setText(doc, 'go-shots', shotsFired.toString());
    setText(doc, 'go-accuracy', accuracy + '%');
    setText(doc, 'go-cascades', cascadeCount.toString());
  }

  function showLevelComplete() {
    const doc = getDoc('levelcomplete');
    setText(doc, 'lc-levelname', 'Level ' + (campaignLevel + 1));
    setText(doc, 'lc-score', score.toString());
    setText(doc, 'lc-popped', bubblesPopped.toString());
    setText(doc, 'lc-shots', shotsFired.toString());
  }

  function showLeaderboard() {
    const doc = getDoc('leaderboard');
    for (let i = 0; i < 10; i++) {
      if (i < leaderboard.length) {
        setText(doc, `lb-s${i}`, leaderboard[i].score.toString());
        setText(doc, `lb-m${i}`, leaderboard[i].mode.toUpperCase());
        setText(doc, `lb-d${i}`, leaderboard[i].date);
      } else {
        setText(doc, `lb-s${i}`, '--');
        setText(doc, `lb-m${i}`, '--');
        setText(doc, `lb-d${i}`, '--');
      }
    }
  }

  function showAchievements() {
    const doc = getDoc('achievements');
    const count = unlockedAchievements.length;
    setText(doc, 'ach-count', count + ' / ' + ACHIEVEMENTS.length);
    for (let i = 0; i < 15 && i < ACHIEVEMENTS.length; i++) {
      const a = ACHIEVEMENTS[i];
      const done = unlockedAchievements.includes(a.id);
      setText(doc, `ac-${i}`, done ? '[X]' : '[ ]');
      setText(doc, `an-${i}`, a.name);
      setText(doc, `ad-${i}`, a.desc);
    }
  }

  function showSettings() {
    const doc = getDoc('settings');
    setText(doc, 'vol-master', Math.round(audio.masterVol * 100).toString());
    setText(doc, 'vol-sfx', Math.round(audio.sfxVol * 100).toString());
    setText(doc, 'vol-music', Math.round(audio.musicVol * 100).toString());
    setText(doc, 'theme-name', THEMES[themeIndex].name);
  }

  function showStats() {
    const doc = getDoc('stats');
    setText(doc, 'st-games', stats.games.toString());
    setText(doc, 'st-score', stats.totalScore.toString());
    setText(doc, 'st-best', stats.bestScore.toString());
    setText(doc, 'st-popped', stats.totalPopped.toString());
    setText(doc, 'st-shots', stats.totalShots.toString());
    setText(doc, 'st-combo', 'x' + stats.bestCombo);
    setText(doc, 'st-cascades', stats.totalCascades.toString());
    const acc = stats.totalShots > 0 ? Math.round(stats.totalPopped / stats.totalShots * 100) : 0;
    setText(doc, 'st-accuracy', acc + '%');
    setText(doc, 'st-powerups', stats.powerUpsUsed.toString());
    setText(doc, 'st-levels', stats.levelsCleared.toString());
  }

  function showSkins() {
    const doc = getDoc('skins');
    for (let i = 0; i < 8; i++) {
      const skin = BUBBLE_SKINS[i];
      setText(doc, `sn-${i}`, skin.name);
      if (i === skinIndex) setText(doc, `ss-${i}`, 'EQUIPPED');
      else if (unlockedSkins.includes(i)) setText(doc, `ss-${i}`, 'UNLOCKED');
      else setText(doc, `ss-${i}`, skin.unlock);
    }
  }

  function updateHUD() {
    const doc = getDoc('hud');
    setText(doc, 'hud-score', score.toString());
    setText(doc, 'hud-combo', 'x' + combo);
    if (gameMode === 'precision') setText(doc, 'hud-shots', shotsLeft.toString());
    else setText(doc, 'hud-shots', shotsFired.toString());
    if (gameMode === 'campaign') setText(doc, 'hud-level', (campaignLevel + 1).toString());
    else setText(doc, 'hud-level', '--');
    if (gameMode === 'timeattack') setText(doc, 'hud-time', Math.ceil(timeLeft).toString());
    else setText(doc, 'hud-time', '--');
    setText(doc, 'hud-mode', gameMode.toUpperCase());
  }

  function updateNextBubbleUI() {
    const doc = getDoc('nextbubble');
    setText(doc, 'next-color', BUBBLE_COLORS[nextColor]?.name || '???');
  }

  // ─── AIM LINE UPDATE ─────────────────────────────────────
  function updateAimLine() {
    if (gameState !== 'playing' || shotBubble) {
      aimLine.visible = false;
      return;
    }
    aimLine.visible = true;

    let x = launcherGroup.position.x;
    let y = launcherGroup.position.y + 0.24;
    let dx = Math.sin(launcherAngle);
    let dy = Math.cos(launcherAngle);
    const positions = aimLineGeo.attributes.position as any;
    let idx = 0;
    const maxBounces = 3;
    const stepLen = 0.05;
    let bounces = 0;

    for (let i = 0; i < 30; i++) {
      positions.setXYZ(idx, x, y, 0.01);
      idx++;
      x += dx * stepLen;
      y += dy * stepLen;

      // Wall bounce
      if (x <= PLAYFIELD_LEFT + BUBBLE_RADIUS && dx < 0) { dx = -dx; bounces++; }
      if (x >= PLAYFIELD_RIGHT - BUBBLE_RADIUS && dx > 0) { dx = -dx; bounces++; }
      if (bounces > maxBounces) break;
      if (y >= PLAYFIELD_TOP) break;

      // Check grid collision
      let hitGrid = false;
      for (const b of grid) {
        const dist = Math.hypot(b.mesh.position.x - x, b.mesh.position.y - y);
        if (dist < BUBBLE_RADIUS * 2.2) { hitGrid = true; break; }
      }
      if (hitGrid) break;
    }

    // Fill remaining positions with last point
    const lastX = positions.getX(idx - 1);
    const lastY = positions.getY(idx - 1);
    for (let i = idx; i < 30; i++) positions.setXYZ(i, lastX, lastY, 0.01);
    positions.needsUpdate = true;
    aimLineGeo.setDrawRange(0, idx);
  }

  // ─── INPUT ────────────────────────────────────────────────
  let mouseX = 0;
  const raycaster = new Raycaster();
  const mouseVec = new Vector2();

  // Browser input
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    if (gameState === 'playing') {
      launcherAngle = mouseX * 1.2; // max ~69 degrees
      launcherAngle = Math.max(-1.2, Math.min(1.2, launcherAngle));
      launcherBarrel.rotation.z = -launcherAngle;
      launcherGlow.position.x = Math.sin(launcherAngle) * 0.24;
      launcherGlow.position.y = Math.cos(launcherAngle) * 0.24;
    }
  });

  window.addEventListener('click', () => {
    audio.init();
    if (gameState === 'playing' && !shotBubble) {
      if (gameMode === 'precision' && shotsLeft <= 0) return;
      if (gameMode === 'precision') shotsLeft--;
      shootBubble();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (gameState === 'playing') { gameActive = false; setGameState('paused'); }
      else if (gameState === 'paused') { gameActive = true; setGameState('playing'); }
    }
    if (e.key === 'r' || e.key === 'R') {
      if (gameState === 'gameover') { clearGrid(); generateGrid(); startCountdown(); }
    }
  });

  // ─── GAME LOOP ────────────────────────────────────────────
  let lastTime = performance.now();
  let elapsedTime = 0;

  function gameLoop() {
    requestAnimationFrame(gameLoop);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    elapsedTime += dt;

    // Try to bind UI
    tryBindUI();

    // Animate decorations
    for (const d of decorations) {
      d.mesh.rotation.y += d.rotSpeed * dt;
      d.mesh.rotation.x += d.rotSpeed * 0.3 * dt;
      d.mesh.position.y = d.baseY + Math.sin(elapsedTime * d.bobSpeed) * d.bobAmp;
    }

    // Ambient particles
    for (const p of ambientParticles) {
      p.mesh.position.x += p.driftX * dt;
      p.mesh.position.z += p.driftZ * dt;
      (p.mesh.material as MeshBasicMaterial).opacity = 0.15 + 0.15 * Math.sin(elapsedTime * p.pulseSpeed);
      if (p.mesh.position.x > 4) p.mesh.position.x = -4;
      if (p.mesh.position.x < -4) p.mesh.position.x = 4;
    }

    // Particles
    particles.update(dt);

    // Toast timer
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) hidePanel('toast');
    }

    // Countdown
    if (gameState === 'countdown') {
      countdownTimer += dt;
      const cdDoc = getDoc('countdown');
      if (countdownTimer < 1) { setText(cdDoc, 'cd-value', '3'); audio.countdownTick(); }
      else if (countdownTimer < 2) { setText(cdDoc, 'cd-value', '2'); }
      else if (countdownTimer < 3) { setText(cdDoc, 'cd-value', '1'); }
      else {
        setText(cdDoc, 'cd-value', 'POP!');
        audio.countdownGo();
        setGameState('playing');
        startGame();
      }
    }

    // XR controller input
    const rightGamepad = (world.input as any).xr?.gamepads?.right;
    if (rightGamepad) {
      // Thumbstick for aiming
      const thumbstick = rightGamepad.getAxesValues?.(0);
      if (thumbstick) {
        launcherAngle += thumbstick.x * 2 * dt;
        launcherAngle = Math.max(-1.2, Math.min(1.2, launcherAngle));
        launcherBarrel.rotation.z = -launcherAngle;
      }
      // Trigger to shoot
      if (rightGamepad.getButtonDown?.(0) && gameState === 'playing' && !shotBubble) {
        if (gameMode !== 'precision' || shotsLeft > 0) {
          if (gameMode === 'precision') shotsLeft--;
          shootBubble();
        }
      }
      // B to pause
      if (rightGamepad.getButtonDown?.(4)) {
        if (gameState === 'playing') { gameActive = false; setGameState('paused'); }
        else if (gameState === 'paused') { gameActive = true; setGameState('playing'); }
      }
    }

    // Combo decay
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) { combo = 1; }
    }

    // Shot bubble physics
    if (shotBubble && gameActive) {
      const s = shotBubble;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      // Wall bounces
      if (s.x <= PLAYFIELD_LEFT + BUBBLE_RADIUS) { s.x = PLAYFIELD_LEFT + BUBBLE_RADIUS; s.vx = Math.abs(s.vx); audio.wallBounce(); }
      if (s.x >= PLAYFIELD_RIGHT - BUBBLE_RADIUS) { s.x = PLAYFIELD_RIGHT - BUBBLE_RADIUS; s.vx = -Math.abs(s.vx); audio.wallBounce(); }

      s.mesh.position.set(s.x, s.y, 0);

      // Ceiling collision
      if (s.y >= PLAYFIELD_TOP - BUBBLE_RADIUS - ceilingOffset) {
        handleShotCollision();
        return;
      }

      // Grid collision
      for (const b of grid) {
        const dist = Math.hypot(b.mesh.position.x - s.x, b.mesh.position.y - s.y);
        if (dist < BUBBLE_RADIUS * 2.1) {
          handleShotCollision();
          return;
        }
      }

      // Out of bounds safety
      if (s.y > PLAYFIELD_TOP + 1 || s.y < PLAYFIELD_BOTTOM - 1) {
        world.scene.remove(s.mesh);
        shotBubble = null;
      }
    }

    // Time attack timer
    if (gameState === 'playing' && gameActive && gameMode === 'timeattack') {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; endGame(); }
    }

    // Precision mode check
    if (gameState === 'playing' && gameActive && gameMode === 'precision' && shotsLeft <= 0 && !shotBubble) {
      endGame();
    }

    // Endless: add rows periodically
    if (gameState === 'playing' && gameActive && gameMode === 'endless') {
      // Could add rows over time; for now ceiling drops handle pressure
    }

    // Update aim line
    updateAimLine();

    // Update HUD
    if (gameState === 'playing') updateHUD();

    // Animate grid bubbles
    for (const b of grid) {
      b.mesh.rotation.y += 0.2 * dt;
      const bobY = Math.sin(elapsedTime * 1.5 + b.row * 0.3 + b.col * 0.5) * 0.003;
      b.mesh.position.y += bobY;
    }

    // Launcher glow pulse
    (launcherGlow.material as MeshBasicMaterial).opacity = 0.3 + 0.2 * Math.sin(elapsedTime * 3);
  }

  // Initialize
  applyTheme();
  setGameState('title');
  gameLoop();
}

main().catch(console.error);
