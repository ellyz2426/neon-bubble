// Neon Bubble VR — Holodeck Puzzle Bobble / Bubble Shooter
// IWSDK 0.4.1 | All UI via PanelUI | Zero HTML DOM
// Round 4: Daily streaks, career/prestige, boss health, 100 achievements, enhanced difficulty curve

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
  'leaderboard' | 'achievements' | 'settings' | 'help' | 'stats' | 'skins' | 'countdown' |
  'levelcomplete' | 'xp' | 'tournament' | 'challenge' | 'bossintro' | 'streak' | 'season';
type GameMode = 'campaign' | 'endless' | 'timeattack' | 'precision' | 'daily' | 'zen' | 'practice' | 'tournament' | 'challenge';
type BubbleColor = 0 | 1 | 2 | 3 | 4 | 5;
type Difficulty = 'easy' | 'medium' | 'hard';
type SpecialBubble = 'bomb' | 'rainbow' | 'lightning' | 'fire' | 'frozen' | 'stone' | 'poison';

interface GridBubble {
  row: number;
  col: number;
  color: BubbleColor;
  mesh: Mesh;
  glow: Mesh;
  wireframe: LineSegments;
  isPowerUp?: 'bomb' | 'rainbow' | 'lightning' | 'fire';
  specialType?: 'frozen' | 'stone' | 'poison';
  frozenHits?: number; // frozen needs 2 hits
  isBoss?: boolean;
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

// Color-blind safe palette (Deuteranopia-friendly)
const CB_BUBBLE_COLORS: typeof BUBBLE_COLORS = [
  { name: 'BLUE', hex: '#0077bb', r: 0, g: 0.47, b: 0.73 },
  { name: 'YELLOW', hex: '#ddaa33', r: 0.87, g: 0.67, b: 0.2 },
  { name: 'TEAL', hex: '#009988', r: 0, g: 0.6, b: 0.53 },
  { name: 'ORANGE', hex: '#ee7733', r: 0.93, g: 0.47, b: 0.2 },
  { name: 'PINK', hex: '#cc3377', r: 0.8, g: 0.2, b: 0.47 },
  { name: 'WHITE', hex: '#dddddd', r: 0.87, g: 0.87, b: 0.87 },
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

// ─── XP / LEVEL SYSTEM ───────────────────────────────────────────
function xpForLevel(level: number): number { return 100 + (level - 1) * 50; }
const MAX_PLAYER_LEVEL = 50;
const XP_REWARDS: { level: number; desc: string }[] = [
  { level: 5, desc: 'Solar Flare skin' }, { level: 10, desc: 'Crimson Arcade theme' },
  { level: 15, desc: 'Frost Core skin' }, { level: 20, desc: 'Toxic Neon theme' },
  { level: 25, desc: 'Plasma Pink skin' }, { level: 30, desc: 'Ultra Violet theme' },
  { level: 35, desc: 'Rainbow skin' }, { level: 40, desc: 'Solar Blaze theme' },
  { level: 50, desc: 'Hologram skin + MASTER title' },
];

// ─── BOSS DEFINITIONS ────────────────────────────────────────────
interface BossConfig {
  name: string;
  desc: string;
  mechanics: string[];
  armoredCount: number;
  regenInterval: number; // seconds between bubble regeneration, 0 = none
  poisonCount: number;
  frozenCount: number;
  stoneCount: number;
}
const BOSS_CONFIGS: BossConfig[] = [
  { name: 'FROST SENTINEL', desc: 'Ice-armored formation', mechanics: ['Frozen bubbles need 2 hits', 'Stone obstacles block path'], armoredCount: 4, regenInterval: 0, poisonCount: 0, frozenCount: 6, stoneCount: 3 },
  { name: 'TOXIC SWARM', desc: 'Poisonous spreading formation', mechanics: ['Poison bubbles spread on miss', 'Bubbles regenerate every 12s'], armoredCount: 0, regenInterval: 12, poisonCount: 8, frozenCount: 0, stoneCount: 2 },
  { name: 'IRON FORTRESS', desc: 'Heavily armored defense', mechanics: ['Many frozen bubbles', 'Dense stone walls'], armoredCount: 6, regenInterval: 0, poisonCount: 0, frozenCount: 10, stoneCount: 8 },
  { name: 'CHAOS ENGINE', desc: 'All special types combined', mechanics: ['Frozen, stone, poison mix', 'Regeneration every 10s'], armoredCount: 4, regenInterval: 10, poisonCount: 5, frozenCount: 5, stoneCount: 5 },
  { name: 'NEON OVERLORD', desc: 'The ultimate challenge', mechanics: ['Maximum special bubbles', 'Fast regeneration 8s', 'Dense formation'], armoredCount: 8, regenInterval: 8, poisonCount: 8, frozenCount: 8, stoneCount: 6 },
  { name: 'VOID TITAN', desc: 'Beyond the holodeck', mechanics: ['Extreme density', 'Rapid regen 6s', 'Poison chains'], armoredCount: 10, regenInterval: 6, poisonCount: 10, frozenCount: 10, stoneCount: 8 },
  { name: 'QUANTUM HYDRA', desc: 'Two heads are worse', mechanics: ['Split formations', 'Regen 7s', 'Max poison'], armoredCount: 6, regenInterval: 7, poisonCount: 12, frozenCount: 6, stoneCount: 4 },
  { name: 'FINAL BOSS', desc: 'The holodeck fights back', mechanics: ['Everything maxed', 'Regen 5s'], armoredCount: 12, regenInterval: 5, poisonCount: 12, frozenCount: 12, stoneCount: 10 },
];

// ─── TOURNAMENT SYSTEM ────────────────────────────────────────────
interface TournamentState {
  round: number; // 1-4
  bracket: { nameA: string; nameB: string; scoreA: number; scoreB: number; winner: string }[];
  playerSlot: number;
  playerScore: number;
  active: boolean;
}
const GHOST_NAMES = ['NeonBot', 'CyberPop', 'GlitchAI', 'VoidRunner', 'LaserKid', 'PixelPunk', 'ByteBlast'];
function generateGhostScore(round: number, difficulty: Difficulty): number {
  const base = difficulty === 'easy' ? 2000 : difficulty === 'medium' ? 4000 : 7000;
  return base + Math.floor(Math.random() * base * (0.5 + round * 0.3));
}

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

// ─── ACHIEVEMENTS (84) ───────────────────────────────────────────
interface Achievement { id: string; name: string; desc: string; }
const ACHIEVEMENTS: Achievement[] = [
  // Popping (8)
  { id: 'first_pop', name: 'First Pop', desc: 'Pop your first bubble cluster' },
  { id: 'ten_pops', name: 'Pop Star', desc: 'Pop 10 clusters total' },
  { id: 'fifty_pops', name: 'Bubble Buster', desc: 'Pop 50 clusters total' },
  { id: 'hundred_pops', name: 'Pop Master', desc: 'Pop 100 clusters total' },
  { id: 'pops_500', name: 'Pop Addict', desc: 'Pop 500 clusters total' },
  { id: 'pops_1000', name: 'Pop God', desc: 'Pop 1000 clusters total' },
  { id: 'clear_board', name: 'Board Wipe', desc: 'Clear all bubbles from the board' },
  { id: 'double_clear', name: 'Double Wipe', desc: 'Clear the board twice in one game' },
  // Cascades (6)
  { id: 'first_cascade', name: 'Chain Reaction', desc: 'Trigger your first cascade' },
  { id: 'cascade_5', name: 'Cascade King', desc: 'Cascade 5+ bubbles at once' },
  { id: 'cascade_10', name: 'Cascade Legend', desc: 'Cascade 10+ bubbles at once' },
  { id: 'cascade_15', name: 'Avalanche', desc: 'Cascade 15+ bubbles at once' },
  { id: 'cascade_20', name: 'Tsunami', desc: 'Cascade 20+ bubbles at once' },
  { id: 'cascades_50', name: 'Chain Master', desc: 'Trigger 50 total cascades' },
  // Combos (6)
  { id: 'combo_x3', name: 'Triple Combo', desc: 'Reach x3 combo multiplier' },
  { id: 'combo_x5', name: 'Combo Maniac', desc: 'Reach x5 combo multiplier' },
  { id: 'combo_x7', name: 'Unstoppable', desc: 'Reach x7 combo multiplier' },
  { id: 'combo_x10', name: 'Perfect Combo', desc: 'Reach x10 combo multiplier' },
  { id: 'combo_30s', name: 'Hot Streak', desc: 'Keep combo above x3 for 30 seconds' },
  { id: 'no_break_game', name: 'Unbroken', desc: 'Win without breaking combo once' },
  // Score (8)
  { id: 'score_1k', name: 'Score 1K', desc: 'Score 1,000+ in one game' },
  { id: 'score_5k', name: 'Score 5K', desc: 'Score 5,000+ in one game' },
  { id: 'score_10k', name: 'Score 10K', desc: 'Score 10,000+ in one game' },
  { id: 'score_25k', name: 'Score Legend', desc: 'Score 25,000+ in one game' },
  { id: 'score_50k', name: 'Legendary', desc: 'Score 50,000+ in one game' },
  { id: 'score_100k', name: 'Mythical', desc: 'Score 100,000+ in one game' },
  { id: 'total_score_100k', name: 'Career 100K', desc: 'Accumulate 100K total score' },
  { id: 'total_score_1m', name: 'Millionaire', desc: 'Accumulate 1M total score' },
  // Power-ups (8)
  { id: 'bomb_used', name: 'Demolition', desc: 'Use a bomb power-up' },
  { id: 'rainbow_used', name: 'Rainbow Pop', desc: 'Use a rainbow power-up' },
  { id: 'lightning_used', name: 'Lightning Strike', desc: 'Use a lightning power-up' },
  { id: 'fire_used', name: 'Pyromaniac', desc: 'Use a fire power-up' },
  { id: 'all_powerups', name: 'Arsenal', desc: 'Use all 4 power-up types in one game' },
  { id: 'powerups_10', name: 'Power Player', desc: 'Use 10 power-ups total' },
  { id: 'powerups_50', name: 'Power Addict', desc: 'Use 50 power-ups total' },
  { id: 'powerups_100', name: 'Power Legend', desc: 'Use 100 power-ups total' },
  // Special bubbles (6)
  { id: 'frozen_break', name: 'Ice Breaker', desc: 'Break a frozen bubble' },
  { id: 'frozen_10', name: 'Defrost Expert', desc: 'Break 10 frozen bubbles' },
  { id: 'poison_clear', name: 'Antidote', desc: 'Clear a poison bubble' },
  { id: 'poison_survive', name: 'Immune', desc: 'Win a game with poison bubbles' },
  { id: 'stone_adjacent', name: 'Rock Solid', desc: 'Clear all bubbles around a stone' },
  { id: 'special_all', name: 'Special Forces', desc: 'Encounter all 3 special types in one game' },
  // Accuracy (5)
  { id: 'accuracy_80', name: 'Sharpshooter', desc: 'Finish with 80%+ accuracy' },
  { id: 'accuracy_95', name: 'Sniper', desc: 'Finish with 95%+ accuracy' },
  { id: 'no_miss_10', name: 'Perfect 10', desc: '10 consecutive matching shots' },
  { id: 'no_miss_20', name: 'Perfect 20', desc: '20 consecutive matching shots' },
  { id: 'no_miss_30', name: 'Perfect 30', desc: '30 consecutive matching shots' },
  // Games played (5)
  { id: 'first_game', name: 'Welcome', desc: 'Play your first game' },
  { id: 'games_10', name: 'Regular', desc: 'Play 10 games' },
  { id: 'games_50', name: 'Dedicated', desc: 'Play 50 games' },
  { id: 'games_100', name: 'Veteran', desc: 'Play 100 games' },
  { id: 'games_500', name: 'Obsessed', desc: 'Play 500 games' },
  // Campaign (6)
  { id: 'campaign_1', name: 'Zone 1 Clear', desc: 'Clear Campaign Zone 1' },
  { id: 'campaign_3', name: 'Halfway', desc: 'Clear Campaign Zone 3' },
  { id: 'campaign_6', name: 'Champion', desc: 'Clear all original zones' },
  { id: 'campaign_50', name: 'Completionist', desc: 'Clear all 50 levels' },
  { id: 'campaign_stars_50', name: 'Star Collector', desc: 'Earn 50 total stars' },
  { id: 'campaign_stars_150', name: 'Star Master', desc: 'Earn 150 total stars (all 3-star)' },
  // Boss (6)
  { id: 'boss_first', name: 'Boss Slayer', desc: 'Defeat your first boss' },
  { id: 'boss_3', name: 'Boss Hunter', desc: 'Defeat 3 bosses' },
  { id: 'boss_all', name: 'Boss Master', desc: 'Defeat all bosses' },
  { id: 'boss_no_miss', name: 'Perfect Boss', desc: 'Defeat a boss with 0 misses' },
  { id: 'boss_speed', name: 'Speed Boss', desc: 'Defeat a boss in under 60 seconds' },
  { id: 'boss_hard', name: 'Hardcore Boss', desc: 'Defeat a boss on hard difficulty' },
  // Tournament (5)
  { id: 'tourn_enter', name: 'Contender', desc: 'Enter a tournament' },
  { id: 'tourn_win_round', name: 'Victor', desc: 'Win a tournament round' },
  { id: 'tourn_win', name: 'Tournament Champion', desc: 'Win a tournament' },
  { id: 'tourn_win_3', name: 'Three-peat', desc: 'Win 3 tournaments' },
  { id: 'tourn_perfect', name: 'Flawless Victory', desc: 'Win tournament undefeated' },
  // XP / Level (5)
  { id: 'xp_level_5', name: 'Rising Star', desc: 'Reach player level 5' },
  { id: 'xp_level_10', name: 'Veteran Player', desc: 'Reach player level 10' },
  { id: 'xp_level_25', name: 'Elite', desc: 'Reach player level 25' },
  { id: 'xp_level_50', name: 'Grand Master', desc: 'Reach player level 50' },
  { id: 'xp_total_10k', name: 'XP Hoarder', desc: 'Earn 10,000 total XP' },
  // Mode-specific (7)
  { id: 'daily_done', name: 'Daily Player', desc: 'Complete a daily challenge' },
  { id: 'speed_clear', name: 'Speed Demon', desc: 'Clear time attack with 30s remaining' },
  { id: 'zen_100', name: 'Zen Master', desc: 'Pop 100 bubbles in Zen mode' },
  { id: 'challenge_create', name: 'Creator', desc: 'Create a custom challenge' },
  { id: 'challenge_play', name: 'Challenger', desc: 'Play a custom challenge' },
  { id: 'challenge_10', name: 'Challenge Addict', desc: 'Play 10 custom challenges' },
  { id: 'endless_survive_5m', name: 'Endurance', desc: 'Survive 5 minutes in endless mode' },
  // Cosmetics (4)
  { id: 'skin_unlock', name: 'Fashionista', desc: 'Unlock a bubble skin' },
  { id: 'skin_all', name: 'Collector', desc: 'Unlock all bubble skins' },
  { id: 'theme_all', name: 'Theme Explorer', desc: 'Try all 5 arena themes' },
  { id: 'colorblind_on', name: 'Accessibility', desc: 'Enable color-blind mode' },
  // Star rating (2)
  { id: 'star_first_3', name: 'Perfect Level', desc: 'Get 3 stars on any level' },
  { id: 'star_all_3', name: 'Perfectionist', desc: 'Get 3 stars on 10+ levels' },
  // Daily Streak (4)
  { id: 'streak_3', name: 'Getting Started', desc: 'Play 3 days in a row' },
  { id: 'streak_7', name: 'Weekly Warrior', desc: 'Play 7 days in a row' },
  { id: 'streak_14', name: 'Fortnight Fighter', desc: 'Play 14 days in a row' },
  { id: 'streak_30', name: 'Monthly Master', desc: 'Play 30 days in a row' },
  // Mastery (8)
  { id: 'comeback_win', name: 'Comeback Kid', desc: 'Win after bubbles past danger zone' },
  { id: 'no_powerup', name: 'Purist', desc: 'Clear a level without using power-ups' },
  { id: 'all_modes_played', name: 'Mode Explorer', desc: 'Play all 9 game modes' },
  { id: 'max_diff_win', name: 'Masochist', desc: 'Win a campaign level on hard' },
  { id: 'flawless', name: 'Flawless', desc: 'Complete a level with 100% accuracy' },
  { id: 'marathon', name: 'Marathon', desc: 'Play for 30 min in one session' },
  { id: 'minimal_shots', name: 'Minimalist', desc: 'Clear a board in under 15 shots' },
  { id: 'boss_pre_regen', name: 'Overwhelming', desc: 'Beat a regen boss before first regen' },
  // Career / Prestige (4)
  { id: 'prestige_1', name: 'Prestige I', desc: 'Reach Prestige level 1' },
  { id: 'prestige_3', name: 'Prestige III', desc: 'Reach Prestige level 3' },
  { id: 'season_complete', name: 'Season Vet', desc: 'Complete a season' },
  { id: 'century', name: 'Century', desc: 'Unlock all 100 achievements' },
];


// ─── BUBBLE SKINS ─────────────────────────────────────────────────
interface BubbleSkin { name: string; multiplier: number; wireColor: string; glowIntensity: number; unlock: string; }
const BUBBLE_SKINS: BubbleSkin[] = [
  { name: 'Classic Neon', multiplier: 1.0, wireColor: '#ffffff', glowIntensity: 1.0, unlock: 'default' },
  { name: 'Solar Flare', multiplier: 1.2, wireColor: '#ff8800', glowIntensity: 1.3, unlock: 'Level 5' },
  { name: 'Frost Core', multiplier: 0.8, wireColor: '#88ccff', glowIntensity: 1.5, unlock: 'Level 15' },
  { name: 'Toxic Pulse', multiplier: 1.1, wireColor: '#00ff44', glowIntensity: 1.2, unlock: 'Play 10 games' },
  { name: 'Plasma Pink', multiplier: 1.0, wireColor: '#ff44aa', glowIntensity: 1.4, unlock: 'x5 combo' },
  { name: 'Void Purple', multiplier: 0.9, wireColor: '#8844ff', glowIntensity: 1.6, unlock: 'Clear a board' },
  { name: 'Chrome', multiplier: 1.0, wireColor: '#cccccc', glowIntensity: 0.8, unlock: '80% accuracy' },
  { name: 'Rainbow', multiplier: 1.3, wireColor: '#ffffff', glowIntensity: 2.0, unlock: 'Level 35' },
  { name: 'Midnight Prism', multiplier: 1.1, wireColor: '#6644ff', glowIntensity: 1.8, unlock: 'Score 25K' },
  { name: 'Hologram', multiplier: 1.0, wireColor: '#44ffee', glowIntensity: 1.3, unlock: 'Level 50' },
];

// ─── CAMPAIGN LEVELS (50 + bosses) ────────────────────────────────
function isBossLevel(level: number): boolean { return level > 0 && (level + 1) % 6 === 0; }
function getBossIndex(level: number): number { return Math.floor(level / 6); }

function generateCampaignLevel(level: number, seed: number): BubbleColor[][] {
  const rng = seededRandom(seed + level * 137);
  // Smoother difficulty curve: rows grow gradually, cap at 10
  const rows = Math.min(4 + Math.floor(level / 5), 10);
  // Colors scale more gradually: start 3, add 1 every 10 levels
  const numColors = Math.min(3 + Math.floor(level / 10), 6) as number;
  // Density: early levels have more gaps, later levels denser
  const gapChance = Math.max(0.05, 0.2 - level * 0.003);
  const grid: BubbleColor[][] = [];
  for (let r = 0; r < rows; r++) {
    const cols = r % 2 === 0 ? MAX_COLS : MAX_COLS - 1;
    const row: BubbleColor[] = [];
    for (let c = 0; c < cols; c++) {
      if (rng() < gapChance) row.push(-1 as BubbleColor);
      else row.push((Math.floor(rng() * numColors)) as BubbleColor);
    }
    grid.push(row);
  }
  return grid;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

// ─── CHALLENGE SYSTEM ─────────────────────────────────────────────
interface ChallengeConfig {
  rows: number;
  colors: number;
  density: number; // 0-1
  specials: number; // 0=none, 1=some, 2=many
  seed: number;
}
function encodeChallengeCode(cfg: ChallengeConfig): string {
  const n = (cfg.rows * 1000000) + (cfg.colors * 100000) + (Math.round(cfg.density * 10) * 10000) +
    (cfg.specials * 1000) + (cfg.seed % 1000);
  const hex = n.toString(16).toUpperCase().padStart(8, '0');
  return hex.slice(0, 4) + '-' + hex.slice(4);
}
function decodeChallengeCode(code: string): ChallengeConfig | null {
  const clean = code.replace('-', '');
  const n = parseInt(clean, 16);
  if (isNaN(n)) return null;
  return {
    rows: Math.floor(n / 1000000) % 100,
    colors: Math.floor(n / 100000) % 10,
    density: (Math.floor(n / 10000) % 10) / 10,
    specials: Math.floor(n / 1000) % 10,
    seed: n % 1000,
  };
}

// ─── DAILY STREAK SYSTEM ──────────────────────────────────────────
interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastPlayDate: string; // YYYY-MM-DD
  totalDaysPlayed: number;
  streakHistory: boolean[]; // last 7 days
}
function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getStreakXPBonus(streak: number): number {
  if (streak >= 30) return 0.5;  // 50% bonus
  if (streak >= 14) return 0.35;
  if (streak >= 7) return 0.25;
  if (streak >= 3) return 0.1;
  return 0;
}

// ─── SEASON / PRESTIGE SYSTEM ─────────────────────────────────────
interface SeasonData {
  season: number;
  seasonPoints: number;
  prestigeLevel: number;
  careerTotal: number;
  tier: number; // 0=bronze,1=silver,2=gold,3=diamond
}
const SEASON_TIERS = [
  { name: 'BRONZE', threshold: 0 },
  { name: 'SILVER', threshold: 10000 },
  { name: 'GOLD', threshold: 25000 },
  { name: 'DIAMOND', threshold: 50000 },
];
function getSeasonTier(points: number): number {
  for (let i = SEASON_TIERS.length - 1; i >= 0; i--) {
    if (points >= SEASON_TIERS[i].threshold) return i;
  }
  return 0;
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
    this.loadSettings();
    this.updateVolumes();
  }

  loadSettings() {
    try {
      const s = localStorage.getItem('nb_audio_settings');
      if (s) {
        const d = JSON.parse(s);
        this.masterVol = d.masterVol ?? 1;
        this.sfxVol = d.sfxVol ?? 1;
        this.musicVol = d.musicVol ?? 1;
      }
    } catch {}
  }

  saveSettings() {
    try {
      localStorage.setItem('nb_audio_settings', JSON.stringify({
        masterVol: this.masterVol, sfxVol: this.sfxVol, musicVol: this.musicVol
      }));
    } catch {}
  }

  updateVolumes() {
    if (this.masterGain) this.masterGain.gain.value = this.masterVol;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVol;
    if (this.musicGain) this.musicGain.gain.value = this.musicVol * 0.15;
  }

  private playSfx(freq: number, type: OscillatorType, dur: number, vol = 0.3, pitchVar = 0) {
    if (!this.ctx || !this.sfxGain) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const pv = pitchVar > 0 ? 1 + (Math.random() - 0.5) * 2 * pitchVar : 1;
    o.type = type; o.frequency.value = freq * pv;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  pop() { this.playSfx(880, 'sine', 0.12, 0.4, 0.08); this.playSfx(1320, 'triangle', 0.08, 0.2, 0.1); }
  cascade() {
    if (!this.ctx) return;
    [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.15, 0.3, 0.05), i * 60));
  }
  shoot() { this.playSfx(220, 'sawtooth', 0.1, 0.2, 0.05); this.playSfx(330, 'triangle', 0.08, 0.15, 0.05); }
  wallBounce() { this.playSfx(440, 'square', 0.05, 0.15, 0.1); }
  attach() { this.playSfx(550, 'triangle', 0.08, 0.2, 0.05); }
  miss() { this.playSfx(150, 'sawtooth', 0.2, 0.25, 0.03); }
  bomb() { this.playSfx(80, 'sawtooth', 0.4, 0.5); this.playSfx(60, 'square', 0.3, 0.3); this.playSfx(40, 'sawtooth', 0.5, 0.2); }
  lightning() { [1100, 1650, 2200, 2750].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sawtooth', 0.1, 0.3, 0.05), i * 30)); }
  fire() { this.playSfx(200, 'sawtooth', 0.3, 0.3); this.playSfx(120, 'square', 0.4, 0.15); }
  rainbow() { [440, 554, 659, 784, 880].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.2, 0.25), i * 70)); }
  levelComplete() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.playSfx(f, 'triangle', 0.3, 0.35), i * 100)); }
  gameOver() { [440, 349, 294, 220].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sawtooth', 0.3, 0.3), i * 120)); }
  gameStart() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.15, 0.3), i * 80)); }
  countdownTick() { this.playSfx(660, 'sine', 0.08, 0.25); }
  countdownGo() { this.playSfx(1047, 'sine', 0.2, 0.4); }
  achievement() { [660, 880, 1100, 1320, 1760].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.2, 0.3), i * 70)); }
  buttonClick() { this.playSfx(880, 'sine', 0.05, 0.15); this.playSfx(1100, 'sine', 0.03, 0.1); }
  combo() { this.playSfx(1100, 'triangle', 0.1, 0.3, 0.05); }
  comboRising(level: number) {
    const baseFreq = 660 + (level - 1) * 110;
    this.playSfx(baseFreq, 'triangle', 0.12, 0.35);
    setTimeout(() => this.playSfx(baseFreq * 1.25, 'sine', 0.1, 0.2), 60);
  }
  ceilingWarning() { this.playSfx(180, 'square', 0.3, 0.15); this.playSfx(160, 'sawtooth', 0.4, 0.1); }
  perfectShot() { [880, 1100, 1320, 1760].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.1, 0.2), i * 40)); }
  bossWarning() { [150, 200, 150, 250, 150, 300].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sawtooth', 0.2, 0.35), i * 120)); }
  frozenBreak() { this.playSfx(1200, 'sine', 0.15, 0.3); this.playSfx(1600, 'triangle', 0.1, 0.2, 0.1); }
  poisonSpread() { this.playSfx(200, 'sawtooth', 0.3, 0.2); this.playSfx(150, 'square', 0.2, 0.15); }
  tournamentWin() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.25, 0.35), i * 100)); }
  firework() { this.playSfx(2000 + Math.random() * 2000, 'sine', 0.15, 0.15, 0.2); }
  streakFanfare() { [660, 784, 880, 1047, 1320].forEach((f, i) => setTimeout(() => this.playSfx(f, 'triangle', 0.2, 0.3), i * 80)); }
  bossPhaseShift() { this.playSfx(120, 'sawtooth', 0.5, 0.35); this.playSfx(90, 'square', 0.6, 0.2); setTimeout(() => this.playSfx(180, 'triangle', 0.3, 0.25), 200); }
  prestigeUp() { [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.3, 0.3), i * 90)); }

  startMusic() {
    if (!this.ctx || !this.musicGain || this.musicPlaying) return;
    this.musicPlaying = true;
    const bass = this.ctx.createOscillator();
    bass.type = 'sine'; bass.frequency.value = 55;
    const bassGain = this.ctx.createGain(); bassGain.gain.value = 0.35;
    bass.connect(bassGain); bassGain.connect(this.musicGain); bass.start();

    const pad = this.ctx.createOscillator();
    pad.type = 'triangle'; pad.frequency.value = 82.5;
    const padFilter = this.ctx.createBiquadFilter();
    padFilter.type = 'lowpass'; padFilter.frequency.value = 400;
    const padGain = this.ctx.createGain(); padGain.gain.value = 0.18;
    pad.connect(padFilter); padFilter.connect(padGain); padGain.connect(this.musicGain); pad.start();

    const pad2 = this.ctx.createOscillator();
    pad2.type = 'sine'; pad2.frequency.value = 110;
    const pad2Filter = this.ctx.createBiquadFilter();
    pad2Filter.type = 'lowpass'; pad2Filter.frequency.value = 300;
    const pad2Gain = this.ctx.createGain(); pad2Gain.gain.value = 0.1;
    pad2.connect(pad2Filter); pad2Filter.connect(pad2Gain); pad2Gain.connect(this.musicGain); pad2.start();

    const shimmer = this.ctx.createOscillator();
    shimmer.type = 'sine'; shimmer.frequency.value = 330;
    const shimmerGain = this.ctx.createGain(); shimmerGain.gain.value = 0.04;
    shimmer.connect(shimmerGain); shimmerGain.connect(this.musicGain); shimmer.start();

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 0.12;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 8;
    lfo.connect(lfoGain); lfoGain.connect(padFilter.frequency); lfo.start();

    const lfo2 = this.ctx.createOscillator();
    lfo2.type = 'sine'; lfo2.frequency.value = 0.08;
    const lfo2Gain = this.ctx.createGain(); lfo2Gain.gain.value = 0.02;
    lfo2.connect(lfo2Gain); lfo2Gain.connect(shimmerGain.gain); lfo2.start();

    this.musicOscs = [bass, pad, pad2, shimmer, lfo, lfo2];
  }

  stopMusic() {
    this.musicOscs.forEach(o => { try { o.stop(); } catch {} });
    this.musicOscs = [];
    this.musicPlaying = false;
  }
}

// ─── PARTICLE SYSTEM ──────────────────────────────────────────────
interface Particle { mesh: Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number; scaleStart?: number; }
interface AnimatedBubble { mesh: Mesh; timer: number; maxTime: number; mode: 'pop' | 'fall'; vy: number; startScale: number; }

class ParticleSystem {
  particles: Particle[] = [];
  animatedBubbles: AnimatedBubble[] = [];
  private pool: Mesh[] = [];
  private scene: any;
  private maxParticles = 300;

  constructor(scene: any) { this.scene = scene; }

  private getMesh(color: Color, size = 0.012): Mesh {
    if (this.pool.length > 0) {
      const mesh = this.pool.pop()!;
      (mesh.material as MeshBasicMaterial).color.copy(color);
      mesh.visible = true;
      return mesh;
    }
    const geo = new SphereGeometry(size, 4, 4);
    const mat = new MeshBasicMaterial({ color, transparent: true, blending: AdditiveBlending });
    const mesh = new Mesh(geo, mat);
    this.scene.add(mesh);
    return mesh;
  }

  burst(x: number, y: number, z: number, color: Color, count: number) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const mesh = this.getMesh(color);
      mesh.position.set(x, y, z); mesh.scale.setScalar(1);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      this.particles.push({
        mesh, vx: Math.cos(angle) * speed * 0.3, vy: Math.sin(angle) * speed * 0.5 + 0.5,
        vz: (Math.random() - 0.5) * 0.3, life: 1, maxLife: 0.6 + Math.random() * 0.6,
      });
    }
  }

  ringBurst(x: number, y: number, z: number, color: Color, radius: number, count: number) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const mesh = this.getMesh(color, 0.015);
      mesh.position.set(x, y, z); mesh.scale.setScalar(1.2);
      const angle = (i / count) * Math.PI * 2;
      const speed = radius * 2;
      this.particles.push({
        mesh, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        vz: 0, life: 1, maxLife: 0.4 + Math.random() * 0.2, scaleStart: 1.5,
      });
    }
  }

  sparkle(x: number, y: number, z: number, color: Color, count: number) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const mesh = this.getMesh(color, 0.006);
      mesh.position.set(x + (Math.random() - 0.5) * 0.1, y + (Math.random() - 0.5) * 0.1, z);
      mesh.scale.setScalar(0.8 + Math.random() * 0.8);
      this.particles.push({
        mesh, vx: (Math.random() - 0.5) * 0.3, vy: 0.3 + Math.random() * 0.5,
        vz: (Math.random() - 0.5) * 0.1, life: 1, maxLife: 0.3 + Math.random() * 0.3, scaleStart: 0.5,
      });
    }
  }

  trail(x: number, y: number, z: number, color: Color) {
    if (this.particles.length >= this.maxParticles) return;
    const mesh = this.getMesh(color, 0.008);
    mesh.position.set(x + (Math.random() - 0.5) * 0.02, y + (Math.random() - 0.5) * 0.02, z);
    mesh.scale.setScalar(0.6);
    this.particles.push({ mesh, vx: 0, vy: -0.1, vz: 0, life: 1, maxLife: 0.25 });
  }

  firework(x: number, y: number, z: number, color: Color) {
    for (let i = 0; i < 20 && this.particles.length < this.maxParticles; i++) {
      const mesh = this.getMesh(color, 0.01);
      mesh.position.set(x, y, z); mesh.scale.setScalar(1.5);
      const angle = (i / 20) * Math.PI * 2;
      const elev = (Math.random() - 0.5) * Math.PI;
      const speed = 1.5 + Math.random() * 1.5;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * Math.cos(elev) * speed,
        vy: Math.sin(elev) * speed + 0.5,
        vz: Math.sin(angle) * Math.cos(elev) * speed,
        life: 1, maxLife: 0.8 + Math.random() * 0.6, scaleStart: 2,
      });
    }
  }

  animatePop(mesh: Mesh) { this.animatedBubbles.push({ mesh, timer: 0, maxTime: 0.15, mode: 'pop', vy: 0, startScale: mesh.scale.x }); }
  animateFall(mesh: Mesh) { this.animatedBubbles.push({ mesh, timer: 0, maxTime: 0.6, mode: 'fall', vy: 0, startScale: mesh.scale.x }); }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt / p.maxLife;
      p.vy -= 2 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      (p.mesh.material as MeshBasicMaterial).opacity = Math.max(0, p.life);
      const s = p.scaleStart ? p.scaleStart * p.life : 0.5 + p.life * 0.5;
      p.mesh.scale.setScalar(s);
      if (p.life <= 0) { p.mesh.visible = false; this.pool.push(p.mesh); this.particles.splice(i, 1); }
    }

    for (let i = this.animatedBubbles.length - 1; i >= 0; i--) {
      const ab = this.animatedBubbles[i];
      ab.timer += dt;
      const t = ab.timer / ab.maxTime;
      if (ab.mode === 'pop') {
        const scaleT = t < 0.4 ? 1 + t * 2.5 : (1 - t) * 2.5;
        ab.mesh.scale.setScalar(ab.startScale * Math.max(0.01, scaleT));
        ab.mesh.traverse(child => { if ((child as any).material?.opacity !== undefined) (child as any).material.opacity = Math.max(0, 1 - t); });
      } else if (ab.mode === 'fall') {
        ab.vy -= 6 * dt;
        ab.mesh.position.y += ab.vy * dt;
        ab.mesh.rotation.z += 3 * dt;
        ab.mesh.traverse(child => { if ((child as any).material?.opacity !== undefined) (child as any).material.opacity = Math.max(0, 1 - t); });
      }
      if (t >= 1) { ab.mesh.visible = false; ab.mesh.parent?.remove(ab.mesh); this.animatedBubbles.splice(i, 1); }
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
  let colorBlindMode = false;

  // Game vars
  let grid: GridBubble[] = [];
  let shotBubble: ShotBubble | null = null;
  let nextColor: BubbleColor = 0;
  let launcherAngle = 0;
  let score = 0;
  let combo = 1;
  let comboTimer = 0;
  let comboAbove3Timer = 0;
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
  let powerUpsUsedThisGame: Set<string> = new Set();
  let zenBubblesPopped = 0;
  let dangerPulse = 0;
  let trailTimer = 0;
  let boardClearsThisGame = 0;
  let neverBrokeCombo = true;
  let gamePlayTime = 0;
  let specialTypesEncountered: Set<string> = new Set();
  let frozenBrokenTotal = 0;
  let screenShakeAmount = 0;
  let screenShakeDecay = 0;

  // XP / Level
  let playerXP = 0;
  let playerLevel = 1;
  let totalXPEarned = 0;

  // Boss
  let isBoss = false;
  let currentBossConfig: BossConfig | null = null;
  let bossRegenTimer = 0;
  let bossDefeatedCount = 0;
  let bossGameStartTime = 0;
  let bossMissCount = 0;

  // Tournament
  let tournament: TournamentState | null = null;
  let tournamentsWon = 0;
  let tournamentRoundsWon = 0;
  let tournamentFlawless = true;

  // Challenge
  let challengeConfig: ChallengeConfig = { rows: 6, colors: 4, density: 0.7, specials: 1, seed: Math.floor(Math.random() * 999) };
  let challengesPlayed = 0;

  // Daily streak
  let streakData: StreakData = { currentStreak: 0, bestStreak: 0, lastPlayDate: '', totalDaysPlayed: 0, streakHistory: [false, false, false, false, false, false, false] };

  // Season / Prestige
  let seasonData: SeasonData = { season: 1, seasonPoints: 0, prestigeLevel: 0, careerTotal: 0, tier: 0 };

  // Modes played tracking
  let modesPlayed: Set<string> = new Set();

  // Danger zone touched tracking (for comeback achievement)
  let touchedDangerZone = false;

  // Boss initial bubble count for health display
  let bossInitialBubbleCount = 0;

  // Session timer for marathon achievement
  let sessionPlayTime = 0;

  // Levels cleared without game over (for streak)
  let consecutiveLevelsCleared = 0;

  // Star ratings per level
  let levelStars: Record<number, number> = {};

  // Replay system (stores last 5 seconds of bubble positions)
  interface ReplayFrame { time: number; gridPositions: { x: number; y: number; color: number }[]; shotPos?: { x: number; y: number }; score: number; }
  let replayBuffer: ReplayFrame[] = [];
  let isReplaying = false;
  let replayIndex = 0;
  let replayTimer = 0;
  let lastBigCascade = false;

  // Achievement page
  let achievementPage = 0;
  const ACH_PER_PAGE = 17;

  // Persistence
  const storage = {
    get(key: string, def: any) { try { const v = localStorage.getItem('nb_' + key); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(key: string, val: any) { try { localStorage.setItem('nb_' + key, JSON.stringify(val)); } catch {} },
  };

  let stats = storage.get('stats', {
    games: 0, totalScore: 0, bestScore: 0, totalPopped: 0, totalShots: 0,
    bestCombo: 1, totalCascades: 0, powerUpsUsed: 0, levelsCleared: 0, totalPops: 0,
    bossesDefeated: 0, tournamentsWon: 0, challengesPlayed: 0, frozenBroken: 0,
  });
  let unlockedAchievements: string[] = storage.get('achievements', []);
  let leaderboard: { score: number; mode: string; date: string }[] = storage.get('leaderboard', []);
  let unlockedSkins: number[] = storage.get('skins', [0]);
  let usedThemes: number[] = storage.get('usedThemes', []);
  playerXP = storage.get('playerXP', 0);
  playerLevel = storage.get('playerLevel', 1);
  totalXPEarned = storage.get('totalXPEarned', 0);
  levelStars = storage.get('levelStars', {});
  bossDefeatedCount = storage.get('bossesDefeated', 0);
  tournamentsWon = storage.get('tournamentsWon', 0);
  challengesPlayed = storage.get('challengesPlayed', 0);
  colorBlindMode = storage.get('colorBlindMode', false);
  streakData = storage.get('streakData', streakData);
  seasonData = storage.get('seasonData', seasonData);
  modesPlayed = new Set(storage.get('modesPlayed', []));

  // Check and update streak on load
  function updateDailyStreak() {
    const today = getTodayStr();
    const yesterday = getYesterdayStr();
    if (streakData.lastPlayDate === today) return; // Already counted today
    if (streakData.lastPlayDate === yesterday) {
      streakData.currentStreak++;
    } else if (streakData.lastPlayDate !== '') {
      streakData.currentStreak = 1; // Streak broken, start fresh
    } else {
      streakData.currentStreak = 1; // First ever play
    }
    streakData.lastPlayDate = today;
    streakData.totalDaysPlayed++;
    if (streakData.currentStreak > streakData.bestStreak) streakData.bestStreak = streakData.currentStreak;
    // Update 7-day history
    streakData.streakHistory.push(true);
    if (streakData.streakHistory.length > 7) streakData.streakHistory.shift();
    storage.set('streakData', streakData);
    // Check streak achievements
    if (streakData.currentStreak >= 3) unlockAchievement('streak_3');
    if (streakData.currentStreak >= 7) unlockAchievement('streak_7');
    if (streakData.currentStreak >= 14) unlockAchievement('streak_14');
    if (streakData.currentStreak >= 30) unlockAchievement('streak_30');
  }

  function awardSeasonPoints(points: number) {
    seasonData.seasonPoints += points;
    seasonData.careerTotal += points;
    const newTier = getSeasonTier(seasonData.seasonPoints);
    if (newTier > seasonData.tier) {
      seasonData.tier = newTier;
      showToast(`🏅 SEASON TIER: ${SEASON_TIERS[newTier].name}!`);
    }
    // Check season completion
    if (seasonData.seasonPoints >= 50000 && seasonData.season === seasonData.prestigeLevel + 1) {
      seasonData.season++;
      seasonData.prestigeLevel++;
      seasonData.seasonPoints = 0;
      seasonData.tier = 0;
      audio.prestigeUp();
      showToast(`⭐ PRESTIGE LEVEL ${seasonData.prestigeLevel}!`);
      unlockAchievement('season_complete');
      if (seasonData.prestigeLevel >= 1) unlockAchievement('prestige_1');
      if (seasonData.prestigeLevel >= 3) unlockAchievement('prestige_3');
    }
    storage.set('seasonData', seasonData);
  }

  function getColors() { return colorBlindMode ? CB_BUBBLE_COLORS : BUBBLE_COLORS; }

  function saveStats() { storage.set('stats', stats); }
  function saveAchievements() { storage.set('achievements', unlockedAchievements); }
  function saveLeaderboard() { storage.set('leaderboard', leaderboard); }
  function saveXP() { storage.set('playerXP', playerXP); storage.set('playerLevel', playerLevel); storage.set('totalXPEarned', totalXPEarned); }
  function saveLevelStars() { storage.set('levelStars', levelStars); }

  function unlockAchievement(id: string) {
    if (unlockedAchievements.includes(id)) return;
    unlockedAchievements.push(id);
    saveAchievements();
    audio.achievement();
    showToast('🏆 ' + ACHIEVEMENTS.find(a => a.id === id)?.name);
  }

  function awardXP(amount: number) {
    if (playerLevel >= MAX_PLAYER_LEVEL) return;
    const streakBonus = getStreakXPBonus(streakData.currentStreak);
    const bonusAmount = Math.floor(amount * streakBonus);
    const totalAmount = amount + bonusAmount;
    playerXP += totalAmount;
    totalXPEarned += totalAmount;
    if (totalXPEarned >= 10000) unlockAchievement('xp_total_10k');
    while (playerLevel < MAX_PLAYER_LEVEL && playerXP >= xpForLevel(playerLevel)) {
      playerXP -= xpForLevel(playerLevel);
      playerLevel++;
      showToast('⬆ LEVEL UP! Level ' + playerLevel);
      checkLevelRewards();
      if (playerLevel >= 5) unlockAchievement('xp_level_5');
      if (playerLevel >= 10) unlockAchievement('xp_level_10');
      if (playerLevel >= 25) unlockAchievement('xp_level_25');
      if (playerLevel >= 50) unlockAchievement('xp_level_50');
    }
    saveXP();
  }

  function checkLevelRewards() {
    // Unlock skins at certain levels
    if (playerLevel >= 5 && !unlockedSkins.includes(1)) { unlockedSkins.push(1); storage.set('skins', unlockedSkins); unlockAchievement('skin_unlock'); }
    if (playerLevel >= 15 && !unlockedSkins.includes(2)) { unlockedSkins.push(2); storage.set('skins', unlockedSkins); }
    if (playerLevel >= 25 && !unlockedSkins.includes(4)) { unlockedSkins.push(4); storage.set('skins', unlockedSkins); }
    if (playerLevel >= 35 && !unlockedSkins.includes(7)) { unlockedSkins.push(7); storage.set('skins', unlockedSkins); }
    if (playerLevel >= 50 && !unlockedSkins.includes(9)) { unlockedSkins.push(9); storage.set('skins', unlockedSkins); }
    const allUnlocked = [0,1,2,3,4,5,6,7,8,9].every(i => unlockedSkins.includes(i));
    if (allUnlocked) unlockAchievement('skin_all');
  }

  function checkSkinUnlocks() {
    if (!unlockedSkins.includes(3) && stats.games >= 10) { unlockedSkins.push(3); storage.set('skins', unlockedSkins); unlockAchievement('skin_unlock'); }
    if (!unlockedSkins.includes(5) && boardClearsThisGame > 0) { unlockedSkins.push(5); storage.set('skins', unlockedSkins); }
    if (!unlockedSkins.includes(6) && stats.totalShots > 0 && stats.totalPopped / stats.totalShots >= 0.8) { unlockedSkins.push(6); storage.set('skins', unlockedSkins); }
    if (!unlockedSkins.includes(8) && stats.bestScore >= 25000) { unlockedSkins.push(8); storage.set('skins', unlockedSkins); }
  }

  function calculateStarRating(): number {
    const accuracy = shotsFired > 0 ? matchingShots / shotsFired : 0;
    let stars = 1;
    if (accuracy >= 0.6 && score >= 2000) stars = 2;
    if (accuracy >= 0.8 && score >= 5000 && combo >= 3) stars = 3;
    return stars;
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
    const size = 20; const divisions = 20;
    const gridGroup = new Group();
    const gridMat = new LineBasicMaterial({ color: THEMES[themeIndex].grid, transparent: true, opacity: 0.15 });
    for (let i = -divisions / 2; i <= divisions / 2; i++) {
      const pos = (i / divisions) * size;
      const geoX = new BufferGeometry();
      geoX.setAttribute('position', new Float32BufferAttribute([-size / 2, 0, pos, size / 2, 0, pos], 3));
      gridGroup.add(new Line(geoX, gridMat));
      const geoZ = new BufferGeometry();
      geoZ.setAttribute('position', new Float32BufferAttribute([pos, 0, -size / 2, pos, 0, size / 2], 3));
      gridGroup.add(new Line(geoZ, gridMat));
    }
    gridGroup.position.y = -0.5;
    world.scene.add(gridGroup);
    const ceilGroup = gridGroup.clone();
    ceilGroup.position.y = 3.5;
    world.scene.add(ceilGroup);
  }
  createGridFloor();

  const decorations: { mesh: Mesh; rotSpeed: number; bobSpeed: number; bobAmp: number; baseY: number }[] = [];
  function createDecorations() {
    const geos = [new TorusGeometry(0.15, 0.04, 8, 12), new BoxGeometry(0.2, 0.2, 0.2), new SphereGeometry(0.12, 8, 8), new ConeGeometry(0.1, 0.2, 6)];
    for (let i = 0; i < 14; i++) {
      const geo = geos[i % geos.length];
      const edges = new EdgesGeometry(geo);
      const mat = new LineBasicMaterial({ color: i % 2 === 0 ? THEMES[themeIndex].grid : THEMES[themeIndex].accent, transparent: true, opacity: 0.3 });
      const mesh = new Mesh(geo, new MeshBasicMaterial({ visible: false }));
      mesh.add(new LineSegments(edges, mat));
      mesh.position.set((Math.random() - 0.5) * 6, 0.5 + Math.random() * 2.5, -2 - Math.random() * 5);
      world.scene.add(mesh);
      decorations.push({ mesh, rotSpeed: 0.2 + Math.random() * 0.5, bobSpeed: 0.3 + Math.random() * 0.4, bobAmp: 0.1 + Math.random() * 0.15, baseY: mesh.position.y });
    }
  }
  createDecorations();

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

  // Playfield walls
  const wallGroup = new Group();
  function createWalls() {
    const wallMat = new MeshStandardMaterial({ color: THEMES[themeIndex].wallColor, emissive: THEMES[themeIndex].grid, emissiveIntensity: 0.3, transparent: true, opacity: 0.3 });
    const wallEdgeMat = new LineBasicMaterial({ color: THEMES[themeIndex].grid, transparent: true, opacity: 0.6 });
    const wallHeight = PLAYFIELD_HEIGHT + 0.5;
    const wallGeo = new BoxGeometry(0.02, wallHeight, 0.02);
    const lw = new Mesh(wallGeo, wallMat);
    lw.position.set(PLAYFIELD_LEFT - 0.01, PLAYFIELD_BOTTOM + wallHeight / 2, 0);
    lw.add(new LineSegments(new EdgesGeometry(wallGeo), wallEdgeMat));
    wallGroup.add(lw);
    const rw = new Mesh(wallGeo, wallMat);
    rw.position.set(PLAYFIELD_RIGHT + 0.01, PLAYFIELD_BOTTOM + wallHeight / 2, 0);
    rw.add(new LineSegments(new EdgesGeometry(wallGeo), wallEdgeMat));
    wallGroup.add(rw);
    const ceilGeo = new BoxGeometry(PLAYFIELD_WIDTH + 0.04, 0.02, 0.02);
    const ceil = new Mesh(ceilGeo, wallMat);
    ceil.position.set(0, PLAYFIELD_TOP + 0.01, 0);
    ceil.add(new LineSegments(new EdgesGeometry(ceilGeo), wallEdgeMat));
    wallGroup.add(ceil);
    const dangerGeo = new BoxGeometry(PLAYFIELD_WIDTH, 0.005, 0.005);
    const dangerMat = new MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.5 });
    const danger = new Mesh(dangerGeo, dangerMat);
    danger.position.set(0, DANGER_Y, 0);
    wallGroup.add(danger);
    world.scene.add(wallGroup);
  }
  createWalls();

  // Launcher
  const launcherGroup = new Group();
  const launcherBase = new Mesh(new CylinderGeometry(0.08, 0.1, 0.06, 12), new MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.4 }));
  launcherBase.add(new LineSegments(new EdgesGeometry(new CylinderGeometry(0.08, 0.1, 0.06, 12)), new LineBasicMaterial({ color: 0x00ffff })));
  launcherGroup.add(launcherBase);
  const launcherBarrel = new Mesh(new CylinderGeometry(0.025, 0.03, 0.2, 8), new MeshStandardMaterial({ color: 0x004444, emissive: 0x00ffff, emissiveIntensity: 0.3 }));
  launcherBarrel.position.y = 0.13;
  launcherBarrel.add(new LineSegments(new EdgesGeometry(new CylinderGeometry(0.025, 0.03, 0.2, 8)), new LineBasicMaterial({ color: 0x00ffff })));
  launcherGroup.add(launcherBarrel);
  const launcherGlow = new Mesh(new SphereGeometry(0.035, 8, 8), new MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5, blending: AdditiveBlending }));
  launcherGlow.position.y = 0.24;
  launcherGroup.add(launcherGlow);
  launcherGroup.position.set(0, LAUNCHER_Y, 0);
  world.scene.add(launcherGroup);

  // Aim guide
  const aimLineMat = new LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 });
  const aimLineGeo = new BufferGeometry();
  const aimLinePositions = new Float32Array(30 * 3);
  aimLineGeo.setAttribute('position', new Float32BufferAttribute(aimLinePositions, 3));
  const aimLine = new Line(aimLineGeo, aimLineMat);
  aimLine.frustumCulled = false;
  world.scene.add(aimLine);

  // Next bubble preview
  let nextBubblePreview: Mesh | null = null;
  function updateNextBubblePreview() {
    if (nextBubblePreview) world.scene.remove(nextBubblePreview);
    const c = getColors()[nextColor];
    const geo = new SphereGeometry(BUBBLE_RADIUS * 0.7, 12, 12);
    const mat = new MeshStandardMaterial({ color: new Color(c.r, c.g, c.b), emissive: new Color(c.r, c.g, c.b), emissiveIntensity: 0.5 });
    nextBubblePreview = new Mesh(geo, mat);
    nextBubblePreview.position.set(-0.15, LAUNCHER_Y, 0);
    world.scene.add(nextBubblePreview);
  }


  // ─── BUBBLE CREATION ──────────────────────────────────────
  function createBubbleMesh(color: BubbleColor, x: number, y: number, powerUp?: string, specialType?: string): { mesh: Mesh; glow: Mesh; wireframe: LineSegments } {
    const c = getColors()[color] || getColors()[0];
    const geo = new SphereGeometry(BUBBLE_RADIUS, 12, 12);
    const mat = new MeshStandardMaterial({
      color: new Color(c.r, c.g, c.b),
      emissive: new Color(c.r, c.g, c.b),
      emissiveIntensity: 0.4,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(x, y, 0);

    const edges = new EdgesGeometry(geo);
    const wireMat = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const wireframe = new LineSegments(edges, wireMat);
    mesh.add(wireframe);

    const glowGeo = new SphereGeometry(BUBBLE_RADIUS * 1.8, 8, 8);
    const glowMat = new MeshBasicMaterial({ color: new Color(c.r, c.g, c.b), transparent: true, opacity: 0.15, blending: AdditiveBlending });
    const glow = new Mesh(glowGeo, glowMat);
    mesh.add(glow);

    // Power-up visual
    if (powerUp) {
      let pColor = 0xffffff;
      if (powerUp === 'bomb') pColor = 0xff0000;
      if (powerUp === 'rainbow') pColor = 0xffffff;
      if (powerUp === 'lightning') pColor = 0x4488ff;
      if (powerUp === 'fire') pColor = 0xff4400;
      const ring = new Mesh(new TorusGeometry(BUBBLE_RADIUS * 1.2, 0.005, 6, 12), new MeshBasicMaterial({ color: pColor, transparent: true, opacity: 0.8, blending: AdditiveBlending }));
      mesh.add(ring);
    }

    // Special type visuals
    if (specialType === 'frozen') {
      const iceRing = new Mesh(new TorusGeometry(BUBBLE_RADIUS * 1.3, 0.008, 6, 8), new MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7, blending: AdditiveBlending }));
      mesh.add(iceRing);
      const iceRing2 = new Mesh(new TorusGeometry(BUBBLE_RADIUS * 1.1, 0.006, 6, 8), new MeshBasicMaterial({ color: 0xaaeeff, transparent: true, opacity: 0.5, blending: AdditiveBlending }));
      iceRing2.rotation.x = Math.PI / 2;
      mesh.add(iceRing2);
    } else if (specialType === 'stone') {
      (mat as MeshStandardMaterial).color.set(0x666666);
      (mat as MeshStandardMaterial).emissive.set(0x333333);
      (mat as MeshStandardMaterial).emissiveIntensity = 0.1;
      (glowMat as MeshBasicMaterial).color.set(0x444444);
      (glowMat as MeshBasicMaterial).opacity = 0.05;
    } else if (specialType === 'poison') {
      const poisonGlow = new Mesh(new SphereGeometry(BUBBLE_RADIUS * 2, 8, 8), new MeshBasicMaterial({ color: 0x44ff00, transparent: true, opacity: 0.12, blending: AdditiveBlending }));
      mesh.add(poisonGlow);
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

  function addGridBubble(row: number, col: number, color: BubbleColor, powerUp?: string, specialType?: string): GridBubble | null {
    if (color === -1 as any) return null;
    const { x, y } = gridToWorld(row, col);
    const { mesh, glow, wireframe } = createBubbleMesh(color, x, y, powerUp, specialType);
    const bubble: GridBubble = { row, col, color, mesh, glow, wireframe, isPowerUp: powerUp as any, specialType: specialType as any };
    if (specialType === 'frozen') bubble.frozenHits = 0;
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
      const b = grid.find(g => g.row === row + dr && g.col === col + dc);
      if (b) neighbors.push(b);
    }
    return neighbors;
  }

  function findCluster(bubble: GridBubble): GridBubble[] {
    const cluster: GridBubble[] = [bubble];
    const visited = new Set<string>([`${bubble.row},${bubble.col}`]);
    const queue = [bubble];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const n of getNeighbors(current.row, current.col)) {
        const key = `${n.row},${n.col}`;
        if (!visited.has(key) && n.color === bubble.color && !n.specialType) {
          visited.add(key);
          cluster.push(n);
          queue.push(n);
        }
      }
    }
    return cluster;
  }

  function findDisconnected(): GridBubble[] {
    const connected = new Set<string>();
    const queue: GridBubble[] = [];
    for (const b of grid) {
      if (b.row === 0) { connected.add(`${b.row},${b.col}`); queue.push(b); }
    }
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const n of getNeighbors(current.row, current.col)) {
        const key = `${n.row},${n.col}`;
        if (!connected.has(key)) { connected.add(key); queue.push(n); }
      }
    }
    return grid.filter(b => !connected.has(`${b.row},${b.col}`) && b.specialType !== 'stone');
  }

  function findNearestGridPos(x: number, y: number): { row: number; col: number } {
    let bestRow = 0, bestCol = 0, bestDist = Infinity;
    for (let r = 0; r < 25; r++) {
      const maxCols = r % 2 === 0 ? MAX_COLS : MAX_COLS - 1;
      for (let c = 0; c < maxCols; c++) {
        const pos = gridToWorld(r, c);
        const dist = Math.hypot(pos.x - x, pos.y - y);
        if (dist < bestDist && !grid.find(g => g.row === r && g.col === c)) {
          bestDist = dist; bestRow = r; bestCol = c;
        }
      }
    }
    return { row: bestRow, col: bestCol };
  }

  // ─── POWER-UP EFFECTS ────────────────────────────────────
  function executePowerUp(type: string, row: number, col: number) {
    stats.powerUpsUsed++;
    powerUpsUsedThisGame.add(type);
    if (powerUpsUsedThisGame.size >= 4) unlockAchievement('all_powerups');
    if (stats.powerUpsUsed >= 10) unlockAchievement('powerups_10');
    if (stats.powerUpsUsed >= 50) unlockAchievement('powerups_50');
    if (stats.powerUpsUsed >= 100) unlockAchievement('powerups_100');

    if (type === 'bomb') {
      audio.bomb(); unlockAchievement('bomb_used');
      const center = gridToWorld(row, col);
      const radius = GRID_SPACING * 3;
      particles.ringBurst(center.x, center.y, 0, new Color(1, 0.3, 0), 0.3, 24);
      particles.burst(center.x, center.y, 0, new Color(1, 0.6, 0), 20);
      screenShakeAmount = 0.03;
      const toRemove = grid.filter(b => {
        if (b.specialType === 'stone') return false;
        const bpos = gridToWorld(b.row, b.col);
        return Math.hypot(bpos.x - center.x, bpos.y - center.y) < radius;
      });
      for (const b of toRemove) {
        if (b.specialType === 'frozen') { handleFrozenHit(b); continue; }
        particles.burst(b.mesh.position.x, b.mesh.position.y, 0, new Color(1, 0.3, 0), 6);
        particles.animatePop(b.mesh); grid.splice(grid.indexOf(b), 1);
        bubblesPopped++; score += 50 * combo;
      }
    } else if (type === 'rainbow') {
      audio.rainbow(); unlockAchievement('rainbow_used');
      const center = gridToWorld(row, col);
      particles.ringBurst(center.x, center.y, 0, new Color(1, 1, 1), 0.25, 20);
      let bestCluster: GridBubble[] = [];
      for (const n of getNeighbors(row, col)) {
        if (n.specialType) continue;
        const cluster = findCluster(n);
        if (cluster.length > bestCluster.length) bestCluster = cluster;
      }
      for (const b of bestCluster) {
        particles.sparkle(b.mesh.position.x, b.mesh.position.y, 0, new Color(1, 1, 1), 4);
        particles.animatePop(b.mesh); grid.splice(grid.indexOf(b), 1);
        bubblesPopped++; score += 100 * combo;
      }
    } else if (type === 'lightning') {
      audio.lightning(); unlockAchievement('lightning_used');
      const center = gridToWorld(row, col);
      particles.ringBurst(center.x, center.y, 0, new Color(0.3, 0.5, 1), 0.4, 16);
      const toRemove = grid.filter(b => b.row === row && b.specialType !== 'stone');
      for (const b of toRemove) {
        if (b.specialType === 'frozen') { handleFrozenHit(b); continue; }
        particles.burst(b.mesh.position.x, b.mesh.position.y, 0, new Color(0.3, 0.5, 1), 6);
        particles.sparkle(b.mesh.position.x, b.mesh.position.y, 0, new Color(0.5, 0.7, 1), 3);
        particles.animatePop(b.mesh); grid.splice(grid.indexOf(b), 1);
        bubblesPopped++; score += 75 * combo;
      }
    } else if (type === 'fire') {
      audio.fire(); unlockAchievement('fire_used');
      const center = gridToWorld(row, col);
      particles.ringBurst(center.x, center.y, 0, new Color(1, 0.5, 0), 0.2, 12);
      const toRemove = grid.filter(b => {
        if (b.specialType === 'stone') return false;
        const bpos = gridToWorld(b.row, b.col);
        return Math.abs(bpos.x - center.x) < GRID_SPACING && b.row <= row;
      });
      for (const b of toRemove) {
        if (b.specialType === 'frozen') { handleFrozenHit(b); continue; }
        particles.burst(b.mesh.position.x, b.mesh.position.y, 0, new Color(1, 0.5, 0), 6);
        particles.animatePop(b.mesh); grid.splice(grid.indexOf(b), 1);
        bubblesPopped++; score += 60 * combo;
      }
    }
  }

  function handleFrozenHit(b: GridBubble) {
    if (!b.frozenHits && b.frozenHits !== 0) b.frozenHits = 0;
    b.frozenHits!++;
    if (b.frozenHits! >= 2) {
      // Frozen bubble breaks
      audio.frozenBreak();
      particles.burst(b.mesh.position.x, b.mesh.position.y, 0, new Color(0.5, 0.8, 1), 8);
      particles.animatePop(b.mesh);
      grid.splice(grid.indexOf(b), 1);
      bubblesPopped++;
      frozenBrokenTotal++;
      stats.frozenBroken = (stats.frozenBroken || 0) + 1;
      unlockAchievement('frozen_break');
      if (stats.frozenBroken >= 10) unlockAchievement('frozen_10');
      score += 200 * combo;
    } else {
      // First hit - crack visual (change color to lighter)
      audio.frozenBreak();
      particles.sparkle(b.mesh.position.x, b.mesh.position.y, 0, new Color(0.5, 0.8, 1), 4);
      // Make the ice rings dimmer
      b.mesh.children.forEach(child => {
        if ((child as any).material?.color) {
          const m = (child as any).material;
          if (m.opacity > 0.5) m.opacity = 0.3;
        }
      });
    }
  }

  function handlePoisonSpread(missRow: number, missCol: number) {
    // When a shot misses next to poison bubbles, poison can spread
    const neighbors = getNeighbors(missRow, missCol);
    const poisonNeighbors = neighbors.filter(b => b.specialType === 'poison');
    if (poisonNeighbors.length > 0) {
      audio.poisonSpread();
      // Spread poison to an empty adjacent cell
      const isOddRow = missRow % 2 !== 0;
      const offsets = isOddRow
        ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
        : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
      for (const [dr, dc] of offsets) {
        const nr = missRow + dr;
        const nc = missCol + dc;
        if (nr >= 0 && nc >= 0 && !grid.find(g => g.row === nr && g.col === nc)) {
          const maxCols = nr % 2 === 0 ? MAX_COLS : MAX_COLS - 1;
          if (nc < maxCols) {
            const poisonColor = Math.floor(Math.random() * 6) as BubbleColor;
            addGridBubble(nr, nc, poisonColor, undefined, 'poison');
            showToast('☠ POISON SPREAD!');
            break;
          }
        }
      }
    }
  }


  // ─── SHOT HANDLING ────────────────────────────────────────
  function shootBubble() {
    if (shotBubble || !gameActive) return;
    audio.init(); audio.shoot();
    shotsFired++;

    const angle = launcherAngle;
    const startX = launcherGroup.position.x;
    const startY = launcherGroup.position.y + 0.24;
    const vx = Math.sin(angle) * SHOT_SPEED;
    const vy = Math.cos(angle) * SHOT_SPEED;

    let powerUp: string | undefined;
    if (Math.random() < 0.08 && gameMode !== 'zen' && gameMode !== 'practice') {
      const types = ['bomb', 'rainbow', 'lightning', 'fire'];
      powerUp = types[Math.floor(Math.random() * types.length)];
    }

    const color = powerUp ? 0 as BubbleColor : nextColor;
    const { mesh, glow, wireframe } = createBubbleMesh(color, startX, startY, powerUp);
    shotBubble = { mesh, glow, wireframe, color, vx, vy, x: startX, y: startY, isPowerUp: powerUp as any };

    const colorsInGrid = [...new Set(grid.filter(b => !b.specialType || b.specialType !== 'stone').map(b => b.color))];
    nextColor = colorsInGrid.length > 0 ? colorsInGrid[Math.floor(Math.random() * colorsInGrid.length)] : (Math.floor(Math.random() * 6) as BubbleColor);
    updateNextBubblePreview();
    updateNextBubbleUI();
  }

  function handleShotCollision() {
    if (!shotBubble) return;

    const { row, col } = findNearestGridPos(shotBubble.x, shotBubble.y);
    const pos = gridToWorld(row, col);

    // Check if we hit a frozen bubble directly
    const hitBubble = grid.find(b => {
      const dist = Math.hypot(b.mesh.position.x - shotBubble!.x, b.mesh.position.y - shotBubble!.y);
      return dist < BUBBLE_RADIUS * 2.2;
    });

    if (hitBubble?.specialType === 'frozen') {
      handleFrozenHit(hitBubble);
      world.scene.remove(shotBubble.mesh);
      shotBubble = null;
      specialTypesEncountered.add('frozen');
      handleCascades();
      return;
    }

    if (hitBubble?.specialType === 'stone') {
      // Bounce off stone — just attach nearby
      audio.wallBounce();
    }

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
      audio.pop();
      consecutiveMatches++;
      matchingShots++;
      combo = Math.min(10, 1 + Math.floor(consecutiveMatches / 2));
      if (combo > bestCombo) bestCombo = combo;
      comboTimer = 3;

      if (combo >= 3) unlockAchievement('combo_x3');
      if (combo >= 5) unlockAchievement('combo_x5');
      if (combo >= 7) unlockAchievement('combo_x7');
      if (combo >= 10) unlockAchievement('combo_x10');
      if (consecutiveMatches >= 10) unlockAchievement('no_miss_10');
      if (consecutiveMatches >= 20) unlockAchievement('no_miss_20');
      if (consecutiveMatches >= 30) unlockAchievement('no_miss_30');

      for (const b of cluster) {
        const c = getColors()[b.color];
        particles.burst(b.mesh.position.x, b.mesh.position.y, 0, new Color(c.r, c.g, c.b), 10);
        particles.sparkle(b.mesh.position.x, b.mesh.position.y, 0, new Color(c.r, c.g, c.b), 4);
        particles.animatePop(b.mesh);
        grid.splice(grid.indexOf(b), 1);
        bubblesPopped++;
        if (gameMode === 'zen') zenBubblesPopped++;
        score += 100 * combo;
      }
      stats.totalPops++;
      if (stats.totalPops === 1) unlockAchievement('first_pop');
      if (stats.totalPops >= 10) unlockAchievement('ten_pops');
      if (stats.totalPops >= 50) unlockAchievement('fifty_pops');
      if (stats.totalPops >= 100) unlockAchievement('hundred_pops');
      if (stats.totalPops >= 500) unlockAchievement('pops_500');
      if (stats.totalPops >= 1000) unlockAchievement('pops_1000');

      if (combo > 1) {
        audio.comboRising(combo);
        if (combo >= 5) showToast('🔥 COMBO x' + combo + '! 🔥');
        else showToast('COMBO x' + combo + '!');
      }

      // Cascades
      handleCascades();

      // Check board clear
      const nonStone = grid.filter(b => b.specialType !== 'stone');
      if (nonStone.length === 0) {
        boardClearsThisGame++;
        unlockAchievement('clear_board');
        if (boardClearsThisGame >= 2) unlockAchievement('double_clear');
        score += 5000;
        showToast('BOARD CLEAR! +5000');
        // Victory fireworks
        spawnFireworks();
        screenShakeAmount = 0.02;

        if (gameMode === 'campaign') { handleLevelComplete(); return; }
        if (gameMode === 'tournament') { handleLevelComplete(); return; }
        if (gameMode === 'endless') { ceilingOffset = 0; missCount = 0; generateGrid(); }
      }
    } else {
      audio.attach();
      consecutiveMatches = 0;
      neverBrokeCombo = false;
      missCount++;
      if (isBoss) bossMissCount++;

      // Poison spread check
      handlePoisonSpread(row, col);

      const missThreshold = difficulty === 'easy' ? 7 : difficulty === 'medium' ? 5 : 3;
      if (missCount >= missThreshold && gameMode !== 'zen' && gameMode !== 'practice') {
        missCount = 0;
        ceilingOffset += CEILING_DROP_AMOUNT;
        audio.ceilingWarning();
        showToast('⚠ CEILING DROP!');
        updateGridPositions();
        const lowestY = Math.min(...grid.map(b => b.mesh.position.y));
        if (lowestY <= DANGER_Y) { endGame(); }
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
      if (disconnected.length >= 15) unlockAchievement('cascade_15');
      if (disconnected.length >= 20) unlockAchievement('cascade_20');
      if (stats.totalCascades >= 50) unlockAchievement('cascades_50');

      // Big cascade = screen shake + replay trigger
      if (disconnected.length >= 8) {
        screenShakeAmount = 0.015 + disconnected.length * 0.001;
        lastBigCascade = true;
      }

      showToast('CASCADE! +' + (disconnected.length * 150 * combo));
      for (const b of disconnected) {
        const c = getColors()[b.color];
        particles.burst(b.mesh.position.x, b.mesh.position.y, 0, new Color(c.r, c.g, c.b), 6);
        particles.animateFall(b.mesh);
        grid.splice(grid.indexOf(b), 1);
        bubblesPopped++;
        if (gameMode === 'zen') zenBubblesPopped++;
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

  function spawnFireworks() {
    const colors = [new Color(0, 1, 1), new Color(1, 0, 1), new Color(0, 1, 0.5), new Color(1, 0.5, 0), new Color(0.67, 0.27, 1)];
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const x = (Math.random() - 0.5) * PLAYFIELD_WIDTH;
        const y = PLAYFIELD_BOTTOM + Math.random() * PLAYFIELD_HEIGHT;
        particles.firework(x, y, 0, colors[i % colors.length]);
        audio.firework();
      }, i * 200);
    }
  }

  // ─── REPLAY SYSTEM ────────────────────────────────────────
  function captureReplayFrame() {
    if (isReplaying || gameState !== 'playing') return;
    const frame: ReplayFrame = {
      time: gamePlayTime,
      gridPositions: grid.map(b => ({ x: b.mesh.position.x, y: b.mesh.position.y, color: b.color })),
      shotPos: shotBubble ? { x: shotBubble.x, y: shotBubble.y } : undefined,
      score,
    };
    replayBuffer.push(frame);
    // Keep last 5 seconds (~150 frames at 30fps)
    while (replayBuffer.length > 150) replayBuffer.shift();
  }

  // ─── BOSS LEVEL GENERATION ────────────────────────────────
  function generateBossGrid(bossIdx: number) {
    clearGrid();
    const boss = BOSS_CONFIGS[Math.min(bossIdx, BOSS_CONFIGS.length - 1)];
    currentBossConfig = boss;
    isBoss = true;
    bossRegenTimer = 0;
    bossGameStartTime = gamePlayTime;
    bossMissCount = 0;

    const rng = seededRandom(42 + bossIdx * 317);
    const rows = 8 + Math.min(bossIdx, 4);
    const numColors = Math.min(4 + Math.floor(bossIdx / 2), 6);

    // Generate base grid
    for (let r = 0; r < rows; r++) {
      const cols = r % 2 === 0 ? MAX_COLS : MAX_COLS - 1;
      for (let c = 0; c < cols; c++) {
        if (rng() < 0.1) continue;
        const color = Math.floor(rng() * numColors) as BubbleColor;
        addGridBubble(r, c, color);
      }
    }

    // Add special bubbles
    const allBubbles = [...grid];
    let frozenPlaced = 0, stonePlaced = 0, poisonPlaced = 0;
    for (const b of allBubbles) {
      if (frozenPlaced < boss.frozenCount && rng() < 0.15) {
        b.specialType = 'frozen'; b.frozenHits = 0;
        // Add visual
        const iceRing = new Mesh(new TorusGeometry(BUBBLE_RADIUS * 1.3, 0.008, 6, 8), new MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7, blending: AdditiveBlending }));
        b.mesh.add(iceRing);
        frozenPlaced++;
      } else if (stonePlaced < boss.stoneCount && rng() < 0.1) {
        b.specialType = 'stone';
        (b.mesh.material as MeshStandardMaterial).color.set(0x666666);
        (b.mesh.material as MeshStandardMaterial).emissive.set(0x333333);
        stonePlaced++;
      } else if (poisonPlaced < boss.poisonCount && rng() < 0.12) {
        b.specialType = 'poison';
        const poisonGlow = new Mesh(new SphereGeometry(BUBBLE_RADIUS * 2, 8, 8), new MeshBasicMaterial({ color: 0x44ff00, transparent: true, opacity: 0.12, blending: AdditiveBlending }));
        b.mesh.add(poisonGlow);
        poisonPlaced++;
      }
      if (b.specialType) specialTypesEncountered.add(b.specialType);
    }
    if (specialTypesEncountered.size >= 3) unlockAchievement('special_all');
    bossInitialBubbleCount = grid.filter(b => b.specialType !== 'stone').length;
  }

  function handleBossRegen(dt: number) {
    if (!isBoss || !currentBossConfig || currentBossConfig.regenInterval <= 0) return;
    bossRegenTimer += dt;
    if (bossRegenTimer >= currentBossConfig.regenInterval) {
      bossRegenTimer = 0;
      // Regenerate 1-3 bubbles in empty top row slots
      const rng = seededRandom(Date.now());
      const maxRegen = Math.min(3, MAX_COLS - grid.filter(b => b.row === 0).length);
      let regenCount = 0;
      for (let c = 0; c < MAX_COLS && regenCount < maxRegen; c++) {
        if (!grid.find(g => g.row === 0 && g.col === c) && rng() < 0.5) {
          const color = Math.floor(rng() * 6) as BubbleColor;
          addGridBubble(0, c, color);
          regenCount++;
        }
      }
      if (regenCount > 0) showToast('⚠ BOSS REGENERATING!');
    }
  }

  // ─── CHALLENGE GENERATION ─────────────────────────────────
  function generateChallengeGrid(cfg: ChallengeConfig) {
    clearGrid();
    const rng = seededRandom(cfg.seed);
    for (let r = 0; r < cfg.rows; r++) {
      const cols = r % 2 === 0 ? MAX_COLS : MAX_COLS - 1;
      for (let c = 0; c < cols; c++) {
        if (rng() > cfg.density) continue;
        const color = Math.floor(rng() * cfg.colors) as BubbleColor;
        let special: string | undefined;
        if (cfg.specials >= 1 && rng() < 0.05 * cfg.specials) {
          const types = ['frozen', 'stone', 'poison'];
          special = types[Math.floor(rng() * types.length)];
        }
        addGridBubble(r, c, color, undefined, special);
      }
    }
  }

  // ─── TOURNAMENT LOGIC ─────────────────────────────────────
  function initTournament() {
    const names = [...GHOST_NAMES].sort(() => Math.random() - 0.5).slice(0, 7);
    names.splice(0, 0, 'YOU');
    const bracket: TournamentState['bracket'] = [];
    for (let i = 0; i < 4; i++) {
      bracket.push({
        nameA: names[i * 2], nameB: names[i * 2 + 1],
        scoreA: 0, scoreB: 0, winner: '',
      });
    }
    tournament = { round: 1, bracket, playerSlot: 0, playerScore: 0, active: true };
    tournamentFlawless = true;
    unlockAchievement('tourn_enter');
  }

  function advanceTournament() {
    if (!tournament) return;
    // Resolve ghost matches
    for (let i = 0; i < tournament.bracket.length; i++) {
      const m = tournament.bracket[i];
      if (m.winner) continue;
      if (m.nameA === 'YOU' || m.nameB === 'YOU') continue;
      m.scoreA = generateGhostScore(tournament.round, difficulty);
      m.scoreB = generateGhostScore(tournament.round, difficulty);
      m.winner = m.scoreA >= m.scoreB ? m.nameA : m.nameB;
    }
  }

  function submitTournamentScore(playerScore: number) {
    if (!tournament) return;
    const myMatch = tournament.bracket.find(m => m.nameA === 'YOU' || m.nameB === 'YOU');
    if (!myMatch) return;
    if (myMatch.nameA === 'YOU') {
      myMatch.scoreA = playerScore;
      myMatch.scoreB = generateGhostScore(tournament.round, difficulty);
      myMatch.winner = myMatch.scoreA >= myMatch.scoreB ? 'YOU' : myMatch.nameB;
    } else {
      myMatch.scoreB = playerScore;
      myMatch.scoreA = generateGhostScore(tournament.round, difficulty);
      myMatch.winner = myMatch.scoreB >= myMatch.scoreA ? 'YOU' : myMatch.nameA;
    }

    if (myMatch.winner === 'YOU') {
      unlockAchievement('tourn_win_round');
      tournamentRoundsWon++;
    } else {
      tournamentFlawless = false;
    }

    advanceTournament();

    // Check if tournament is over (all matches resolved)
    if (tournament.bracket.every(m => m.winner)) {
      if (tournament.round < 3) { // Semifinals -> Finals -> Champion
        // Build next round bracket
        const winners: string[] = [];
        for (let i = 0; i < tournament.bracket.length; i += 2) {
          if (i + 1 < tournament.bracket.length) {
            winners.push(tournament.bracket[i].winner, tournament.bracket[i + 1].winner);
          } else {
            winners.push(tournament.bracket[i].winner);
          }
        }
        const newBracket: TournamentState['bracket'] = [];
        for (let i = 0; i < winners.length; i += 2) {
          if (i + 1 < winners.length) {
            newBracket.push({ nameA: winners[i], nameB: winners[i + 1], scoreA: 0, scoreB: 0, winner: '' });
          }
        }
        tournament.round++;
        tournament.bracket = newBracket;
      } else {
        // Tournament complete
        const finalWinner = tournament.bracket[0]?.winner;
        if (finalWinner === 'YOU') {
          tournamentsWon++;
          storage.set('tournamentsWon', tournamentsWon);
          stats.tournamentsWon = tournamentsWon;
          saveStats();
          unlockAchievement('tourn_win');
          if (tournamentsWon >= 3) unlockAchievement('tourn_win_3');
          if (tournamentFlawless) unlockAchievement('tourn_perfect');
          audio.tournamentWin();
          spawnFireworks();
          showToast('🏆 TOURNAMENT CHAMPION! 🏆');
        }
        tournament.active = false;
      }
    }
  }


  // ─── GAME FLOW ────────────────────────────────────────────
  function generateGrid() {
    clearGrid();
    isBoss = false;
    currentBossConfig = null;

    if (gameMode === 'campaign') {
      if (isBossLevel(campaignLevel)) {
        generateBossGrid(getBossIndex(campaignLevel));
        return;
      }
      const layout = generateCampaignLevel(campaignLevel, 42);
      for (let r = 0; r < layout.length; r++) {
        for (let c = 0; c < layout[r].length; c++) {
          addGridBubble(r, c, layout[r][c]);
        }
      }
      // Add special bubbles in later levels
      if (campaignLevel >= 15) {
        const rng = seededRandom(campaignLevel * 73);
        const allBubbles = [...grid];
        for (const b of allBubbles) {
          if (rng() < 0.04 && campaignLevel >= 20) { b.specialType = 'frozen'; b.frozenHits = 0; specialTypesEncountered.add('frozen'); }
          else if (rng() < 0.03 && campaignLevel >= 25) { b.specialType = 'stone'; specialTypesEncountered.add('stone'); }
          else if (rng() < 0.03 && campaignLevel >= 30) { b.specialType = 'poison'; specialTypesEncountered.add('poison'); }
        }
      }
    } else if (gameMode === 'daily') {
      const today = new Date();
      const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const layout = generateCampaignLevel(5, daySeed);
      for (let r = 0; r < layout.length; r++) {
        for (let c = 0; c < layout[r].length; c++) addGridBubble(r, c, layout[r][c]);
      }
    } else if (gameMode === 'challenge') {
      generateChallengeGrid(challengeConfig);
    } else if (gameMode === 'tournament') {
      // Tournament uses medium-difficulty random grids
      const numColors = 5;
      const rows = 7;
      for (let r = 0; r < rows; r++) {
        const cols = r % 2 === 0 ? MAX_COLS : MAX_COLS - 1;
        for (let c = 0; c < cols; c++) {
          if (Math.random() < 0.12) continue;
          addGridBubble(r, c, Math.floor(Math.random() * numColors) as BubbleColor);
        }
      }
    } else {
      const numColors = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
      const rows = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 7 : 9;
      for (let r = 0; r < rows; r++) {
        const cols = r % 2 === 0 ? MAX_COLS : MAX_COLS - 1;
        for (let c = 0; c < cols; c++) {
          if (Math.random() < 0.12) continue;
          addGridBubble(r, c, Math.floor(Math.random() * numColors) as BubbleColor);
        }
      }
    }
  }

  function startGame() {
    audio.init(); audio.startMusic();
    score = 0; combo = 1; comboTimer = 0; comboAbove3Timer = 0;
    shotsFired = 0; bubblesPopped = 0; cascadeCount = 0;
    matchingShots = 0; consecutiveMatches = 0; bestCombo = 1;
    ceilingOffset = 0; missCount = 0; gameActive = true;
    powerUpsUsedThisGame = new Set();
    zenBubblesPopped = 0; dangerPulse = 0;
    boardClearsThisGame = 0; neverBrokeCombo = true;
    gamePlayTime = 0; specialTypesEncountered = new Set();
    frozenBrokenTotal = 0; replayBuffer = [];
    isReplaying = false; lastBigCascade = false;
    bossMissCount = 0; touchedDangerZone = false;

    // Update daily streak
    updateDailyStreak();

    // Track mode played
    modesPlayed.add(gameMode);
    storage.set('modesPlayed', [...modesPlayed]);
    if (modesPlayed.size >= 9) unlockAchievement('all_modes_played');
    if (shotBubble) { world.scene.remove(shotBubble.mesh); shotBubble = null; }

    if (gameMode === 'timeattack') timeLeft = 90;
    else if (gameMode === 'precision') shotsLeft = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 20 : 15;
    else { timeLeft = 0; shotsLeft = 0; }

    const colorsInGrid = grid.length > 0 ? [...new Set(grid.filter(b => !b.specialType || b.specialType !== 'stone').map(b => b.color))] : [0, 1, 2, 3, 4, 5];
    nextColor = (colorsInGrid[Math.floor(Math.random() * colorsInGrid.length)] || 0) as BubbleColor;
    updateNextBubblePreview();
    updateNextBubbleUI();
    audio.gameStart();
  }

  function handleLevelComplete() {
    gameActive = false;

    if (gameMode === 'tournament') {
      submitTournamentScore(score);
      showTournamentBracket();
      setGameState('tournament');
      return;
    }

    stats.levelsCleared++;
    const zone = Math.floor(campaignLevel / 6) + 1;
    if (zone >= 1) unlockAchievement('campaign_1');
    if (zone >= 3) unlockAchievement('campaign_3');
    if (zone >= 6) unlockAchievement('campaign_6');
    if (campaignLevel >= 49) unlockAchievement('campaign_50');

    // Boss defeated tracking
    if (isBoss) {
      bossDefeatedCount++;
      storage.set('bossesDefeated', bossDefeatedCount);
      stats.bossesDefeated = bossDefeatedCount;
      unlockAchievement('boss_first');
      if (bossDefeatedCount >= 3) unlockAchievement('boss_3');
      if (bossDefeatedCount >= BOSS_CONFIGS.length) unlockAchievement('boss_all');
      if (bossMissCount === 0) unlockAchievement('boss_no_miss');
      if (gamePlayTime - bossGameStartTime < 60) unlockAchievement('boss_speed');
      if (difficulty === 'hard') unlockAchievement('boss_hard');
      // Check if boss was beaten before first regen
      if (currentBossConfig && currentBossConfig.regenInterval > 0 && bossRegenTimer < currentBossConfig.regenInterval) {
        unlockAchievement('boss_pre_regen');
      }
    }

    // New round 4 achievements
    consecutiveLevelsCleared++;
    if (touchedDangerZone) unlockAchievement('comeback_win');
    if (powerUpsUsedThisGame.size === 0) unlockAchievement('no_powerup');
    if (difficulty === 'hard') unlockAchievement('max_diff_win');
    if (shotsFired > 0 && matchingShots === shotsFired && shotsFired >= 5) unlockAchievement('flawless');
    if (shotsFired > 0 && shotsFired <= 15 && grid.filter(b => b.specialType !== 'stone').length === 0) unlockAchievement('minimal_shots');

    // Star rating
    const stars = calculateStarRating();
    const prevStars = levelStars[campaignLevel] || 0;
    if (stars > prevStars) {
      levelStars[campaignLevel] = stars;
      saveLevelStars();
    }
    if (stars >= 3) unlockAchievement('star_first_3');
    const threeStarCount = Object.values(levelStars).filter(s => s >= 3).length;
    if (threeStarCount >= 10) unlockAchievement('star_all_3');

    // Check total stars
    const totalStars = Object.values(levelStars).reduce((a, b) => a + b, 0);
    if (totalStars >= 50) unlockAchievement('campaign_stars_50');
    if (totalStars >= 150) unlockAchievement('campaign_stars_150');

    // Award XP
    let xpEarned = 100 + stars * 50;
    if (isBoss) xpEarned += 200;
    awardXP(xpEarned);

    // Award season points
    awardSeasonPoints(score + (isBoss ? 500 : 0) + stars * 100);

    audio.levelComplete();
    spawnFireworks();
    showLevelComplete(stars, xpEarned);
    setGameState('levelcomplete');
  }

  function endGame() {
    gameActive = false;
    audio.stopMusic();
    audio.gameOver();
    isBoss = false;
    currentBossConfig = null;

    stats.games++;
    stats.totalScore += score;
    stats.totalPopped += bubblesPopped;
    stats.totalShots += shotsFired;
    if (score > stats.bestScore) stats.bestScore = score;
    if (bestCombo > stats.bestCombo) stats.bestCombo = bestCombo;
    saveStats();
    checkSkinUnlocks();

    // XP for finishing (even losing)
    awardXP(Math.floor(score / 100) + 10);

    unlockAchievement('first_game');
    if (score >= 1000) unlockAchievement('score_1k');
    if (score >= 5000) unlockAchievement('score_5k');
    if (score >= 10000) unlockAchievement('score_10k');
    if (score >= 25000) unlockAchievement('score_25k');
    if (score >= 50000) unlockAchievement('score_50k');
    if (score >= 100000) unlockAchievement('score_100k');
    if (stats.totalScore >= 100000) unlockAchievement('total_score_100k');
    if (stats.totalScore >= 1000000) unlockAchievement('total_score_1m');
    if (stats.games >= 10) unlockAchievement('games_10');
    if (stats.games >= 50) unlockAchievement('games_50');
    if (stats.games >= 100) unlockAchievement('games_100');
    if (stats.games >= 500) unlockAchievement('games_500');
    if (gameMode === 'daily') unlockAchievement('daily_done');
    if (gameMode === 'timeattack' && timeLeft >= 30) unlockAchievement('speed_clear');
    if (gameMode === 'zen' && zenBubblesPopped >= 100) unlockAchievement('zen_100');
    if (gameMode === 'endless' && gamePlayTime >= 300) unlockAchievement('endless_survive_5m');
    if (gameMode === 'challenge') { challengesPlayed++; stats.challengesPlayed = challengesPlayed; storage.set('challengesPlayed', challengesPlayed); unlockAchievement('challenge_play'); if (challengesPlayed >= 10) unlockAchievement('challenge_10'); }
    if (comboAbove3Timer >= 30) unlockAchievement('combo_30s');
    if (neverBrokeCombo && score > 0 && matchingShots >= 5) unlockAchievement('no_break_game');
    if (sessionPlayTime >= 1800) unlockAchievement('marathon'); // 30 minutes
    const accuracy = shotsFired > 0 ? matchingShots / shotsFired : 0;
    if (accuracy >= 0.8 && shotsFired >= 5) unlockAchievement('accuracy_80');
    if (accuracy >= 0.95 && shotsFired >= 10) unlockAchievement('accuracy_95');
    if (grid.filter(b => b.specialType === 'poison').length > 0) unlockAchievement('poison_survive');
    // Check stone_adjacent
    for (const stone of grid.filter(b => b.specialType === 'stone')) {
      const neighbors = getNeighbors(stone.row, stone.col);
      if (neighbors.filter(n => n.specialType !== 'stone').length === 0) unlockAchievement('stone_adjacent');
    }

    // Leaderboard
    leaderboard.push({ score, mode: gameMode, date: new Date().toLocaleDateString() });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 20);
    saveLeaderboard();

    // Season points (half for losses)
    awardSeasonPoints(Math.floor(score / 2));
    consecutiveLevelsCleared = 0;

    // Century check
    if (unlockedAchievements.length >= 100) unlockAchievement('century');

    if (gameMode === 'tournament') {
      submitTournamentScore(score);
      showTournamentBracket();
      setGameState('tournament');
      return;
    }

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
        behavior: FollowBehavior.PivotY, speed: 5, tolerance: 0.3,
      });
    }
    if (opts.screenSpace) {
      entity.addComponent(ScreenSpace, { width: opts.ssOpts?.width || '50vw', height: 'auto', ...(opts.ssOpts || {}), zOffset: 0.25 });
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
  createUIPanel('title', '/ui/title.json', { maxWidth: 0.7, maxHeight: 1.0, position: [0, 1.2, -1.5] });
  createUIPanel('modeselect', '/ui/modeselect.json', { maxWidth: 0.9, maxHeight: 1.1, position: [0, 1.2, -1.5] });
  createUIPanel('difficulty', '/ui/difficulty.json', { maxWidth: 0.5, maxHeight: 0.7, position: [0, 1.2, -1.5] });
  createUIPanel('hud', '/ui/hud.json', { maxWidth: 0.45, maxHeight: 0.1, follower: true, position: [0, 0.2, -0.5] });
  createUIPanel('pause', '/ui/pause.json', { maxWidth: 0.5, maxHeight: 0.5, position: [0, 1.2, -1.2] });
  createUIPanel('gameover', '/ui/gameover.json', { maxWidth: 0.7, maxHeight: 0.8, position: [0, 1.2, -1.5] });
  createUIPanel('leaderboard', '/ui/leaderboard.json', { maxWidth: 0.8, maxHeight: 1.0, position: [0, 1.2, -1.5] });
  createUIPanel('achievements', '/ui/achievements.json', { maxWidth: 0.9, maxHeight: 1.1, position: [0, 1.2, -1.5] });
  createUIPanel('settings', '/ui/settings.json', { maxWidth: 0.7, maxHeight: 0.9, position: [0, 1.2, -1.5] });
  createUIPanel('help', '/ui/help.json', { maxWidth: 0.8, maxHeight: 1.2, position: [0, 1.2, -1.5] });
  createUIPanel('stats', '/ui/stats.json', { maxWidth: 0.6, maxHeight: 0.9, position: [0, 1.2, -1.5] });
  createUIPanel('skins', '/ui/skins.json', { maxWidth: 0.7, maxHeight: 0.7, position: [0, 1.2, -1.5] });
  createUIPanel('toast', '/ui/toast.json', { maxWidth: 0.3, maxHeight: 0.08, follower: true, position: [0, -0.15, -0.5] });
  createUIPanel('countdown', '/ui/countdown.json', { maxWidth: 0.25, maxHeight: 0.25, follower: true, position: [0, 0, -0.6] });
  createUIPanel('levelcomplete', '/ui/levelcomplete.json', { maxWidth: 0.6, maxHeight: 0.7, position: [0, 1.2, -1.5] });
  createUIPanel('nextbubble', '/ui/nextbubble.json', { maxWidth: 0.12, maxHeight: 0.08, follower: true, position: [-0.2, -0.1, -0.5] });
  createUIPanel('xp', '/ui/xp.json', { maxWidth: 0.7, maxHeight: 1.0, position: [0, 1.2, -1.5] });
  createUIPanel('tournament', '/ui/tournament.json', { maxWidth: 0.8, maxHeight: 1.0, position: [0, 1.2, -1.5] });
  createUIPanel('challenge', '/ui/challenge.json', { maxWidth: 0.7, maxHeight: 1.0, position: [0, 1.2, -1.5] });
  createUIPanel('bossintro', '/ui/bossintro.json', { maxWidth: 0.6, maxHeight: 0.6, position: [0, 1.2, -1.2] });
  createUIPanel('streak', '/ui/streak.json', { maxWidth: 0.7, maxHeight: 1.0, position: [0, 1.2, -1.5] });
  createUIPanel('season', '/ui/season.json', { maxWidth: 0.8, maxHeight: 1.0, position: [0, 1.2, -1.5] });

  let uiBindingsReady = false;
  function tryBindUI() {
    if (uiBindingsReady) return;
    const titleDoc = getDoc('title');
    if (!titleDoc) return;
    uiBindingsReady = true;

    // Title
    bindClick(titleDoc, 'btn-play', () => setGameState('modeselect'));
    bindClick(titleDoc, 'btn-scores', () => { showLeaderboard(); setGameState('leaderboard'); });
    bindClick(titleDoc, 'btn-achievements', () => { achievementPage = 0; showAchievements(); setGameState('achievements'); });
    bindClick(titleDoc, 'btn-stats', () => { showStats(); setGameState('stats'); });
    bindClick(titleDoc, 'btn-skins', () => { showSkins(); setGameState('skins'); });
    bindClick(titleDoc, 'btn-settings', () => { showSettings(); setGameState('settings'); });
    bindClick(titleDoc, 'btn-help', () => setGameState('help'));
    bindClick(titleDoc, 'btn-xp', () => { showXP(); setGameState('xp'); });
    bindClick(titleDoc, 'btn-streak', () => { showStreak(); setGameState('streak'); });
    bindClick(titleDoc, 'btn-career', () => { showSeason(); setGameState('season'); });
    updateTitleXP();

    // Mode select
    const modeDoc = getDoc('modeselect');
    const modes: [string, GameMode][] = [
      ['btn-campaign', 'campaign'], ['btn-endless', 'endless'], ['btn-timeattack', 'timeattack'],
      ['btn-precision', 'precision'], ['btn-daily', 'daily'], ['btn-zen', 'zen'], ['btn-practice', 'practice'],
    ];
    for (const [btnId, mode] of modes) {
      bindClick(modeDoc, btnId, () => { gameMode = mode; setGameState('difficulty'); });
    }
    bindClick(modeDoc, 'btn-tournament', () => { gameMode = 'tournament'; initTournament(); showTournamentBracket(); setGameState('tournament'); });
    bindClick(modeDoc, 'btn-challenge', () => { gameMode = 'challenge'; updateChallengeUI(); setGameState('challenge'); });
    bindClick(modeDoc, 'btn-back', () => setGameState('title'));

    // Difficulty
    const diffDoc = getDoc('difficulty');
    const diffs: [string, Difficulty][] = [['btn-easy', 'easy'], ['btn-medium', 'medium'], ['btn-hard', 'hard']];
    for (const [btnId, diff] of diffs) {
      bindClick(diffDoc, btnId, () => {
        difficulty = diff;
        if (gameMode === 'campaign' && isBossLevel(campaignLevel)) {
          showBossIntro();
          setGameState('bossintro');
        } else {
          startCountdown();
        }
      });
    }
    bindClick(diffDoc, 'btn-back', () => setGameState('modeselect'));

    // Pause
    const pauseDoc = getDoc('pause');
    bindClick(pauseDoc, 'btn-resume', () => { setGameState('playing'); gameActive = true; });
    bindClick(pauseDoc, 'btn-quit', () => { gameActive = false; audio.stopMusic(); clearGrid(); isBoss = false; setGameState('title'); });

    // Game over
    const goDoc = getDoc('gameover');
    bindClick(goDoc, 'btn-rematch', () => { clearGrid(); generateGrid(); startCountdown(); });
    bindClick(goDoc, 'btn-title', () => { clearGrid(); setGameState('title'); });

    // Leaderboard
    bindClick(getDoc('leaderboard'), 'btn-back', () => setGameState('title'));

    // Achievements — with pagination
    const achDoc = getDoc('achievements');
    bindClick(achDoc, 'btn-back', () => setGameState('title'));
    bindClick(achDoc, 'btn-ach-prev', () => { achievementPage = Math.max(0, achievementPage - 1); showAchievements(); });
    bindClick(achDoc, 'btn-ach-next', () => { achievementPage = Math.min(Math.ceil(ACHIEVEMENTS.length / ACH_PER_PAGE) - 1, achievementPage + 1); showAchievements(); });

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
    bindClick(lcDoc, 'btn-next', () => {
      campaignLevel++;
      clearGrid();
      if (campaignLevel < 50 && isBossLevel(campaignLevel)) {
        generateGrid();
        showBossIntro();
        setGameState('bossintro');
      } else {
        generateGrid();
        startCountdown();
      }
    });
    bindClick(lcDoc, 'btn-title', () => { clearGrid(); setGameState('title'); });

    // XP
    bindClick(getDoc('xp'), 'btn-back', () => setGameState('title'));

    // Tournament
    const tournDoc = getDoc('tournament');
    bindClick(tournDoc, 'btn-tourn-play', () => {
      if (tournament && tournament.active) {
        clearGrid(); generateGrid(); startCountdown();
      }
    });
    bindClick(tournDoc, 'btn-back', () => { tournament = null; setGameState('modeselect'); });

    // Challenge
    const chalDoc = getDoc('challenge');
    bindClick(chalDoc, 'btn-rows-down', () => { challengeConfig.rows = Math.max(3, challengeConfig.rows - 1); updateChallengeUI(); });
    bindClick(chalDoc, 'btn-rows-up', () => { challengeConfig.rows = Math.min(12, challengeConfig.rows + 1); updateChallengeUI(); });
    bindClick(chalDoc, 'btn-colors-down', () => { challengeConfig.colors = Math.max(2, challengeConfig.colors - 1); updateChallengeUI(); });
    bindClick(chalDoc, 'btn-colors-up', () => { challengeConfig.colors = Math.min(6, challengeConfig.colors + 1); updateChallengeUI(); });
    bindClick(chalDoc, 'btn-density-down', () => { challengeConfig.density = Math.max(0.3, challengeConfig.density - 0.1); updateChallengeUI(); });
    bindClick(chalDoc, 'btn-density-up', () => { challengeConfig.density = Math.min(1.0, challengeConfig.density + 0.1); updateChallengeUI(); });
    bindClick(chalDoc, 'btn-specials-down', () => { challengeConfig.specials = Math.max(0, challengeConfig.specials - 1); updateChallengeUI(); });
    bindClick(chalDoc, 'btn-specials-up', () => { challengeConfig.specials = Math.min(2, challengeConfig.specials + 1); updateChallengeUI(); });
    bindClick(chalDoc, 'btn-chal-gen', () => { challengeConfig.seed = Math.floor(Math.random() * 999); unlockAchievement('challenge_create'); updateChallengeUI(); });
    bindClick(chalDoc, 'btn-chal-play', () => { clearGrid(); generateGrid(); startCountdown(); });
    bindClick(chalDoc, 'btn-back', () => setGameState('modeselect'));

    // Boss intro
    bindClick(getDoc('bossintro'), 'btn-boss-start', () => { startCountdown(); });

    // Streak
    bindClick(getDoc('streak'), 'btn-back', () => setGameState('title'));

    // Season
    bindClick(getDoc('season'), 'btn-back', () => setGameState('title'));
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
        audio.updateVolumes(); audio.saveSettings();
        setText(doc, valueId, Math.round(audio[key] * 100).toString());
      });
      bindClick(doc, `btn-${prefix}-up`, () => {
        audio[key] = Math.min(1, audio[key] + 0.1);
        audio.updateVolumes(); audio.saveSettings();
        setText(doc, valueId, Math.round(audio[key] * 100).toString());
      });
    }
    bindClick(doc, 'btn-theme-prev', () => { themeIndex = (themeIndex - 1 + THEMES.length) % THEMES.length; applyTheme(); setText(doc, 'theme-name', THEMES[themeIndex].name); });
    bindClick(doc, 'btn-theme-next', () => { themeIndex = (themeIndex + 1) % THEMES.length; applyTheme(); setText(doc, 'theme-name', THEMES[themeIndex].name); });
    bindClick(doc, 'btn-colorblind', () => {
      colorBlindMode = !colorBlindMode;
      storage.set('colorBlindMode', colorBlindMode);
      setText(doc, 'cb-status', colorBlindMode ? 'ON' : 'OFF');
      if (colorBlindMode) unlockAchievement('colorblind_on');
    });
  }

  function bindSkinsButtons() {
    const doc = getDoc('skins');
    if (!doc) return;
    for (let i = 0; i < 10; i++) {
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
      case 'title': showPanel('title'); updateTitleXP(); break;
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
      case 'xp': showPanel('xp'); break;
      case 'tournament': showPanel('tournament'); break;
      case 'challenge': showPanel('challenge'); break;
      case 'bossintro': showPanel('bossintro'); break;
      case 'streak': showPanel('streak'); break;
      case 'season': showPanel('season'); break;
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

  function updateTitleXP() {
    const doc = getDoc('title');
    setText(doc, 'title-xp', `Level ${playerLevel} | ${playerXP}/${xpForLevel(playerLevel)} XP`);
    const streakStr = streakData.currentStreak > 0 ? `🔥 ${streakData.currentStreak} Day Streak` : '🔥 No Streak';
    setText(doc, 'title-streak', streakStr);
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

  function showLevelComplete(stars?: number, xpEarned?: number) {
    const doc = getDoc('levelcomplete');
    const lvlName = isBoss ? `BOSS: ${currentBossConfig?.name || 'DEFEATED'}` : 'Level ' + (campaignLevel + 1);
    setText(doc, 'lc-levelname', lvlName);
    setText(doc, 'lc-score', score.toString());
    setText(doc, 'lc-popped', bubblesPopped.toString());
    setText(doc, 'lc-shots', shotsFired.toString());
    const starStr = stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '★★★';
    setText(doc, 'lc-stars', starStr);
    setText(doc, 'lc-xp', xpEarned ? `+${xpEarned} XP` : '');
  }

  function showBossIntro() {
    const doc = getDoc('bossintro');
    const bossIdx = getBossIndex(campaignLevel);
    const boss = BOSS_CONFIGS[Math.min(bossIdx, BOSS_CONFIGS.length - 1)];
    setText(doc, 'boss-name', boss.name);
    setText(doc, 'boss-desc', boss.desc);
    setText(doc, 'boss-mech1', boss.mechanics[0] || '');
    setText(doc, 'boss-mech2', boss.mechanics[1] || '');
    audio.bossWarning();
  }

  function showLeaderboard() {
    const doc = getDoc('leaderboard');
    for (let i = 0; i < 10; i++) {
      if (i < leaderboard.length) {
        setText(doc, `lb-s${i}`, leaderboard[i].score.toString());
        setText(doc, `lb-m${i}`, leaderboard[i].mode.toUpperCase());
        setText(doc, `lb-d${i}`, leaderboard[i].date);
      } else {
        setText(doc, `lb-s${i}`, '--'); setText(doc, `lb-m${i}`, '--'); setText(doc, `lb-d${i}`, '--');
      }
    }
  }

  function showAchievements() {
    const doc = getDoc('achievements');
    const count = unlockedAchievements.length;
    const totalPages = Math.ceil(ACHIEVEMENTS.length / ACH_PER_PAGE);
    setText(doc, 'ach-count', count + ' / ' + ACHIEVEMENTS.length);
    setText(doc, 'ach-page', `Page ${achievementPage + 1} / ${totalPages}`);
    const start = achievementPage * ACH_PER_PAGE;
    for (let i = 0; i < ACH_PER_PAGE; i++) {
      const achIdx = start + i;
      if (achIdx < ACHIEVEMENTS.length) {
        const a = ACHIEVEMENTS[achIdx];
        const done = unlockedAchievements.includes(a.id);
        setText(doc, `ac-${i}`, done ? '[✓]' : '[ ]');
        setText(doc, `an-${i}`, a.name);
        setText(doc, `ad-${i}`, a.desc);
      } else {
        setText(doc, `ac-${i}`, ''); setText(doc, `an-${i}`, ''); setText(doc, `ad-${i}`, '');
      }
    }
  }

  function showSettings() {
    const doc = getDoc('settings');
    setText(doc, 'vol-master', Math.round(audio.masterVol * 100).toString());
    setText(doc, 'vol-sfx', Math.round(audio.sfxVol * 100).toString());
    setText(doc, 'vol-music', Math.round(audio.musicVol * 100).toString());
    setText(doc, 'theme-name', THEMES[themeIndex].name);
    setText(doc, 'cb-status', colorBlindMode ? 'ON' : 'OFF');
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
    for (let i = 0; i < 10; i++) {
      const skin = BUBBLE_SKINS[i];
      if (!skin) continue;
      setText(doc, `sn-${i}`, skin.name);
      if (i === skinIndex) setText(doc, `ss-${i}`, 'EQUIPPED');
      else if (unlockedSkins.includes(i)) setText(doc, `ss-${i}`, 'UNLOCKED');
      else setText(doc, `ss-${i}`, skin.unlock);
    }
  }

  function showXP() {
    const doc = getDoc('xp');
    setText(doc, 'xp-level', playerLevel.toString());
    const needed = xpForLevel(playerLevel);
    const pct = playerLevel >= MAX_PLAYER_LEVEL ? 100 : Math.floor((playerXP / needed) * 100);
    setText(doc, 'xp-progress', playerLevel >= MAX_PLAYER_LEVEL ? 'MAX LEVEL' : `${playerXP} / ${needed} XP`);
    // Update bar width via style
    const barEl = doc?.getElementById('xp-bar');
    if (barEl && (barEl as any).width) (barEl as any).width.value = `${pct}%`;

    for (let i = 0; i < XP_REWARDS.length && i < 9; i++) {
      const rw = XP_REWARDS[i];
      const unlocked = playerLevel >= rw.level;
      setText(doc, `rw-${i}`, `${unlocked ? '✓' : '○'} Lv${rw.level}: ${rw.desc}`);
    }
  }

  function showStreak() {
    const doc = getDoc('streak');
    setText(doc, 'streak-count', streakData.currentStreak.toString());
    setText(doc, 'streak-best', `BEST: ${streakData.bestStreak} DAYS`);
    const bonus = getStreakXPBonus(streakData.currentStreak);
    setText(doc, 'streak-bonus', bonus > 0 ? `XP BONUS: +${Math.round(bonus * 100)}%` : 'XP BONUS: +0%');
    const msgs = ['Play daily to build your streak!', 'Nice start!', 'Keep it going!', 'On fire!', 'Legendary streak!'];
    const msgIdx = streakData.currentStreak >= 14 ? 4 : streakData.currentStreak >= 7 ? 3 : streakData.currentStreak >= 3 ? 2 : streakData.currentStreak >= 1 ? 1 : 0;
    setText(doc, 'streak-info', msgs[msgIdx]);
    for (let i = 0; i < 7; i++) {
      const active = i < streakData.streakHistory.length && streakData.streakHistory[i];
      setText(doc, `d${i}`, active ? '●' : '○');
    }
  }

  function showSeason() {
    const doc = getDoc('season');
    setText(doc, 'prestige-level', `PRESTIGE ${seasonData.prestigeLevel}`);
    setText(doc, 'season-status', `Season ${seasonData.season} — ${seasonData.seasonPoints >= 50000 ? 'Complete!' : 'In Progress'}`);
    const pct = Math.min(100, Math.floor((seasonData.seasonPoints / 50000) * 100));
    setText(doc, 'season-progress-text', `${seasonData.seasonPoints.toLocaleString()} / 50,000 SP`);
    const barEl = doc?.getElementById('season-bar');
    if (barEl && (barEl as any).width) (barEl as any).width.value = `${pct}%`;
    const nextTierIdx = Math.min(seasonData.tier + 1, SEASON_TIERS.length - 1);
    if (seasonData.tier < SEASON_TIERS.length - 1) {
      setText(doc, 'season-reward', `Next: ${SEASON_TIERS[nextTierIdx].name} at ${SEASON_TIERS[nextTierIdx].threshold.toLocaleString()} SP`);
    } else {
      setText(doc, 'season-reward', 'Max tier reached! Complete season at 50,000 SP');
    }
    setText(doc, 'career-total', `Career Total: ${seasonData.careerTotal.toLocaleString()} SP`);
  }

  function showTournamentBracket() {
    const doc = getDoc('tournament');
    if (!tournament) return;
    setText(doc, 'tourn-round', `ROUND ${tournament.round} / 3`);
    setText(doc, 'tourn-status', tournament.active ? 'IN PROGRESS' : 'COMPLETE');
    for (let i = 0; i < 4; i++) {
      if (i < tournament.bracket.length) {
        const m = tournament.bracket[i];
        setText(doc, `tm-${i}a`, m.nameA);
        setText(doc, `tm-${i}b`, m.nameB);
        setText(doc, `tm-${i}s`, m.winner ? `${m.scoreA} vs ${m.scoreB} → ${m.winner}` : '--');
      } else {
        setText(doc, `tm-${i}a`, '--'); setText(doc, `tm-${i}b`, '--'); setText(doc, `tm-${i}s`, '--');
      }
    }
  }

  function updateChallengeUI() {
    const doc = getDoc('challenge');
    setText(doc, 'chal-rows', challengeConfig.rows.toString());
    setText(doc, 'chal-colors', challengeConfig.colors.toString());
    setText(doc, 'chal-density', Math.round(challengeConfig.density * 100) + '%');
    const specLabels = ['NONE', 'SOME', 'MANY'];
    setText(doc, 'chal-specials', specLabels[challengeConfig.specials] || 'NONE');
    setText(doc, 'chal-code', encodeChallengeCode(challengeConfig));
  }

  function updateHUD() {
    const doc = getDoc('hud');
    setText(doc, 'hud-score', score.toString());
    setText(doc, 'hud-combo', 'x' + combo);
    if (gameMode === 'precision') setText(doc, 'hud-shots', shotsLeft.toString());
    else setText(doc, 'hud-shots', shotsFired.toString());
    if (gameMode === 'campaign') {
      const label = isBoss ? 'BOSS' : (campaignLevel + 1).toString();
      setText(doc, 'hud-level', label);
    } else setText(doc, 'hud-level', '--');
    if (gameMode === 'timeattack') setText(doc, 'hud-time', Math.ceil(timeLeft).toString());
    else setText(doc, 'hud-time', '--');
    setText(doc, 'hud-mode', gameMode.toUpperCase());
    // Boss health display
    if (isBoss && bossInitialBubbleCount > 0) {
      const remaining = grid.filter(b => b.specialType !== 'stone').length;
      const hp = Math.max(0, Math.round((remaining / bossInitialBubbleCount) * 100));
      setText(doc, 'hud-boss-hp', hp + '%');
    } else {
      setText(doc, 'hud-boss-hp', '--');
    }
    // Streak indicator
    if (streakData.currentStreak > 0) {
      setText(doc, 'hud-streak-display', '🔥' + streakData.currentStreak);
    } else {
      setText(doc, 'hud-streak-display', '');
    }
  }

  function updateNextBubbleUI() {
    const doc = getDoc('nextbubble');
    setText(doc, 'next-color', getColors()[nextColor]?.name || '???');
  }


  // ─── AIM LINE UPDATE ─────────────────────────────────────
  function updateAimLine() {
    if (gameState !== 'playing' || shotBubble) { aimLine.visible = false; return; }
    aimLine.visible = true;

    let x = launcherGroup.position.x;
    let y = launcherGroup.position.y + 0.24;
    let dx = Math.sin(launcherAngle);
    let dy = Math.cos(launcherAngle);
    const positions = aimLineGeo.attributes.position as any;
    let idx = 0;
    const stepLen = 0.05;
    let bounces = 0;

    for (let i = 0; i < 30; i++) {
      positions.setXYZ(idx, x, y, 0.01); idx++;
      x += dx * stepLen; y += dy * stepLen;
      if (x <= PLAYFIELD_LEFT + BUBBLE_RADIUS && dx < 0) { dx = -dx; bounces++; }
      if (x >= PLAYFIELD_RIGHT - BUBBLE_RADIUS && dx > 0) { dx = -dx; bounces++; }
      if (bounces > 3) break;
      if (y >= PLAYFIELD_TOP) break;
      let hitGrid = false;
      for (const b of grid) {
        if (Math.hypot(b.mesh.position.x - x, b.mesh.position.y - y) < BUBBLE_RADIUS * 2.2) { hitGrid = true; break; }
      }
      if (hitGrid) break;
    }

    const lastX = positions.getX(idx - 1);
    const lastY = positions.getY(idx - 1);
    for (let i = idx; i < 30; i++) positions.setXYZ(i, lastX, lastY, 0.01);
    positions.needsUpdate = true;
    aimLineGeo.setDrawRange(0, idx);
  }

  // ─── INPUT ────────────────────────────────────────────────
  let mouseX = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    if (gameState === 'playing') {
      launcherAngle = mouseX * 1.2;
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
  let replayFrameTimer = 0;

  function gameLoop() {
    requestAnimationFrame(gameLoop);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    elapsedTime += dt;

    tryBindUI();

    // Decorations
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

    particles.update(dt);

    // Screen shake
    if (screenShakeAmount > 0) {
      const shakeX = (Math.random() - 0.5) * screenShakeAmount;
      const shakeY = (Math.random() - 0.5) * screenShakeAmount;
      world.scene.position.x = shakeX;
      world.scene.position.y = shakeY;
      screenShakeAmount *= 0.9;
      if (screenShakeAmount < 0.001) {
        screenShakeAmount = 0;
        world.scene.position.x = 0;
        world.scene.position.y = 0;
      }
    }

    // Toast timer
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) hidePanel('toast'); }

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
      const thumbstick = rightGamepad.getAxesValues?.(0);
      if (thumbstick) {
        launcherAngle += thumbstick.x * 2 * dt;
        launcherAngle = Math.max(-1.2, Math.min(1.2, launcherAngle));
        launcherBarrel.rotation.z = -launcherAngle;
      }
      if (rightGamepad.getButtonDown?.(0) && gameState === 'playing' && !shotBubble) {
        if (gameMode !== 'precision' || shotsLeft > 0) {
          if (gameMode === 'precision') shotsLeft--;
          shootBubble();
        }
      }
      if (rightGamepad.getButtonDown?.(4)) {
        if (gameState === 'playing') { gameActive = false; setGameState('paused'); }
        else if (gameState === 'paused') { gameActive = true; setGameState('playing'); }
      }
    }

    // Game logic
    if (gameState === 'playing' && gameActive) {
      gamePlayTime += dt;
      sessionPlayTime += dt;

      // Combo decay
      if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) { combo = 1; } }
      if (combo >= 3) comboAbove3Timer += dt;

      // Boss regen
      handleBossRegen(dt);

      // Replay capture
      replayFrameTimer += dt;
      if (replayFrameTimer >= 0.033) { // ~30fps
        replayFrameTimer = 0;
        captureReplayFrame();
      }

      // Shot bubble physics
      if (shotBubble) {
        const s = shotBubble;
        s.x += s.vx * dt; s.y += s.vy * dt;

        trailTimer += dt;
        if (trailTimer >= 0.03) {
          trailTimer = 0;
          const c = getColors()[s.color] || getColors()[0];
          particles.trail(s.x, s.y, 0, new Color(c.r, c.g, c.b));
        }

        if (s.x <= PLAYFIELD_LEFT + BUBBLE_RADIUS) { s.x = PLAYFIELD_LEFT + BUBBLE_RADIUS; s.vx = Math.abs(s.vx); audio.wallBounce(); }
        if (s.x >= PLAYFIELD_RIGHT - BUBBLE_RADIUS) { s.x = PLAYFIELD_RIGHT - BUBBLE_RADIUS; s.vx = -Math.abs(s.vx); audio.wallBounce(); }

        s.mesh.position.set(s.x, s.y, 0);

        if (s.y >= PLAYFIELD_TOP - BUBBLE_RADIUS - ceilingOffset) { handleShotCollision(); }
        else {
          for (const b of grid) {
            if (Math.hypot(b.mesh.position.x - s.x, b.mesh.position.y - s.y) < BUBBLE_RADIUS * 2.1) {
              handleShotCollision(); break;
            }
          }
        }

        if (shotBubble && (shotBubble.y > PLAYFIELD_TOP + 1 || shotBubble.y < PLAYFIELD_BOTTOM - 1)) {
          world.scene.remove(shotBubble.mesh); shotBubble = null;
        }
      }

      // Time attack timer
      if (gameMode === 'timeattack') { timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; endGame(); } }

      // Precision mode check
      if (gameMode === 'precision' && shotsLeft <= 0 && !shotBubble) { endGame(); }

      // Update aim line
      updateAimLine();

      // Update HUD
      updateHUD();

      // Danger zone pulsing
      if (grid.length > 0) {
        const lowestY = Math.min(...grid.map(b => b.mesh.position.y));
        const dangerProximity = Math.max(0, 1 - (lowestY - DANGER_Y) / (PLAYFIELD_HEIGHT * 0.3));
        if (dangerProximity > 0.7) touchedDangerZone = true;
        dangerPulse += dt * (2 + dangerProximity * 4);
        const dangerChild = wallGroup.children.find(c => c.position.y === DANGER_Y);
        if (dangerChild) {
          const pulse = 0.3 + dangerProximity * 0.5 + Math.sin(dangerPulse) * 0.2 * dangerProximity;
          ((dangerChild as Mesh).material as MeshBasicMaterial).opacity = pulse;
          if (dangerProximity > 0.5) {
            ((dangerChild as Mesh).material as MeshBasicMaterial).color.setRGB(1, 0.1 + 0.3 * (1 - dangerProximity), 0.1);
          }
        }
        // Boss phase visual effects - intensify as health drops
        if (isBoss && bossInitialBubbleCount > 0) {
          const remaining = grid.filter(b => b.specialType !== 'stone').length;
          const hpRatio = remaining / bossInitialBubbleCount;
          // Phase 2: below 50% - red tint on accent lights
          if (hpRatio < 0.5) {
            accentLight2.color.setRGB(1, 0.2, 0.1);
            accentLight2.intensity = 1.2 + Math.sin(elapsedTime * 3) * 0.3;
          }
          // Phase 3: below 25% - rapid pulse, danger ambience
          if (hpRatio < 0.25) {
            accentLight1.color.setRGB(1, 0.1, 0.1);
            accentLight1.intensity = 1.5 + Math.sin(elapsedTime * 5) * 0.5;
          }
        }
      }

      // Animate grid bubbles
      for (const b of grid) {
        b.mesh.rotation.y += 0.2 * dt;
        // Enhanced wobble: subtle bobbing + scale pulse
        const wobblePhase = elapsedTime * 1.5 + b.row * 0.3 + b.col * 0.5;
        b.mesh.position.y += Math.sin(wobblePhase) * 0.003;
        // Scale pulse for power-up bubbles
        if (b.isPowerUp) {
          const pulse = 1 + Math.sin(elapsedTime * 4 + b.col * 0.7) * 0.05;
          b.mesh.scale.setScalar(pulse);
        }
        // Glow intensity pulse based on combo
        if (combo > 1) {
          const comboGlow = 0.15 + combo * 0.02 + Math.sin(elapsedTime * 2) * 0.03;
          (b.glow.material as MeshBasicMaterial).opacity = comboGlow;
        }
        // Poison pulse
        if (b.specialType === 'poison') {
          b.mesh.children.forEach(child => {
            if ((child as any).material?.color) {
              const mat = (child as any).material;
              if (mat.opacity !== undefined && mat.opacity < 0.2) {
                mat.opacity = 0.08 + 0.05 * Math.sin(elapsedTime * 3 + b.row);
              }
            }
          });
        }
        // Boss bubbles get red tint when low health
        if (isBoss && b.isBoss && bossInitialBubbleCount > 0) {
          const remaining = grid.filter(g => g.specialType !== 'stone').length;
          if (remaining / bossInitialBubbleCount < 0.3) {
            (b.glow.material as MeshBasicMaterial).color.lerp(new Color(1, 0.2, 0.1), 0.01);
          }
        }
      }
    }

    // Launcher glow pulse - enhanced with combo
    const baseGlow = 0.3 + 0.2 * Math.sin(elapsedTime * 3);
    const comboBoost = gameState === 'playing' ? Math.min(combo * 0.05, 0.3) : 0;
    (launcherGlow.material as MeshBasicMaterial).opacity = baseGlow + comboBoost;
    if (combo >= 5 && gameState === 'playing') {
      (launcherGlow.material as MeshBasicMaterial).color.setRGB(1, 0.3 + Math.sin(elapsedTime * 5) * 0.3, 0);
    } else {
      (launcherGlow.material as MeshBasicMaterial).color.set(0x00ffff);
    }
  }

  // Initialize
  applyTheme();
  setGameState('title');
  gameLoop();
}

main().catch(console.error);
