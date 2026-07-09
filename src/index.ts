import {
  World,
  createSystem,
  PanelUI,
  PanelDocument,
  UIKitDocument,
  UIKit,
  Follower,
  InputComponent,
  eq,
  SphereGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  BoxGeometry,
  CylinderGeometry,
  TorusGeometry,
  OctahedronGeometry,
  IcosahedronGeometry,
  Mesh,
  Group,
  Color,
  Vector3,
  AdditiveBlending,
  PointLight,
  DirectionalLight,
  AmbientLight,
  FogExp2,
  LineSegments,
  EdgesGeometry,
  Object3D,
  type Entity,
} from '@iwsdk/core';

// ─── Types ──────────────────────────────────────────────────────────
type GameState =
  | 'title' | 'modes' | 'difficulty' | 'countdown' | 'playing'
  | 'gameover' | 'paused' | 'leaderboard' | 'achievements'
  | 'settings' | 'stats' | 'skins' | 'help';

type EnemyType = 'straight' | 'sine' | 'dive' | 'circle' | 'formation' | 'turret' | 'tank' | 'boss' | 'sniper' | 'swarm' | 'carrier';
type PowerUpType = 'spread' | 'laser' | 'missile' | 'shield' | 'speed' | 'magnet' | 'bomb';
type Difficulty = 'easy' | 'normal' | 'hard' | 'insane';

interface Enemy {
  mesh: Mesh;
  group: Group;
  type: EnemyType;
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  points: number;
  timer: number;
  baseY: number;
  fireTimer: number;
  active: boolean;
}

interface Bullet {
  mesh: Mesh;
  x: number; y: number;
  vx: number; vy: number;
  damage: number;
  isPlayer: boolean;
  active: boolean;
}

interface PowerUp {
  mesh: Mesh;
  group: Group;
  type: PowerUpType;
  x: number; y: number;
  active: boolean;
  timer: number;
}

interface Particle {
  mesh: Mesh;
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  active: boolean;
}

interface TrailParticle {
  mesh: Mesh;
  life: number;
  maxLife: number;
  active: boolean;
}

interface Debris {
  mesh: Mesh;
  group: Group;
  x: number; y: number;
  vx: number;
  rotSpeed: number;
  active: boolean;
}

interface Drone {
  mesh: Mesh;
  group: Group;
  angle: number;
  fireTimer: number;
  active: boolean;
}

interface Asteroid {
  mesh: Mesh;
  group: Group;
  x: number; y: number;
  vx: number; vy: number;
  rotSpeed: number;
  hp: number;
  size: number;
  active: boolean;
}

interface PlayerState {
  x: number; y: number;
  speed: number;
  fireRate: number;
  fireTimer: number;
  weapon: 'normal' | 'spread' | 'laser' | 'missile';
  weaponLevel: number;
  weaponTimer: number;
  shielded: boolean;
  shieldTimer: number;
  speedBoost: boolean;
  speedTimer: number;
  lives: number;
  invincible: boolean;
  invincTimer: number;
  mesh: Mesh | null;
  group: Group | null;
  shieldMesh: Mesh | null;
  chargeTime: number;
  charging: boolean;
  chargeMesh: Mesh | null;
  drones: Drone[];
  droneCount: number;
  grazeCount: number;
  grazeTotal: number;
  bombs: number;
  magnetActive: boolean;
  magnetTimer: number;
}

interface BossState {
  active: boolean;
  phase: number;
  hp: number;
  maxHp: number;
  timer: number;
  patternTimer: number;
  enemy: Enemy | null;
}

interface Achievement {
  id: string;
  name: string;
  desc: string;
  check: (s: SaveData) => boolean;
}

interface SaveData {
  highScores: { name: string; score: number; mode: string; date: string }[];
  totalKills: number;
  totalShots: number;
  totalDeaths: number;
  totalGames: number;
  totalPlayTime: number;
  totalPowerUps: number;
  totalBossKills: number;
  totalGrazes: number;
  totalMiniBossKills: number;
  totalAsteroidsDestroyed: number;
  totalDroneKills: number;
  totalChargeShots: number;
  totalCarrierKills: number;
  totalBombs: number;
  totalMagnets: number;
  maxCombo: number;
  maxStage: number;
  maxGrazeStreak: number;
  achievements: string[];
  unlockedSkins: string[];
  selectedSkin: number;
  selectedTheme: number;
  xp: number;
  level: number;
  settings: { sfx: boolean; music: boolean; particles: boolean; screenShake: boolean };
}

// ─── Constants ──────────────────────────────────────────────────────
const FIELD_W = 12, FIELD_H = 7;
const FIELD_Z = -6;
const SCROLL_SPEED = 2.0;
const PLAYER_SPEED = 5.0;
const BULLET_SPEED = 12;
const ENEMY_BULLET_SPEED = 5;
const FIRE_RATE = 0.15;
const XP_PER_LEVEL = 500;

const THEMES = [
  { name: 'Neon Holodeck', grid: '#004444', accent: '#00ffff', bg: '#000a0a', fog: '#001111', wall: '#003333', player: '#00ffff', enemy: '#ff4444', bullet: '#00ffff', powerup: '#ffff00' },
  { name: 'Crimson Grid', grid: '#440000', accent: '#ff4444', bg: '#0a0000', fog: '#110000', wall: '#330000', player: '#ff6666', enemy: '#44ff44', bullet: '#ff4444', powerup: '#ffaa00' },
  { name: 'Toxic Neon', grid: '#004400', accent: '#44ff44', bg: '#000a00', fog: '#001100', wall: '#003300', player: '#66ff66', enemy: '#ff44ff', bullet: '#44ff44', powerup: '#44aaff' },
  { name: 'Ultra Violet', grid: '#220044', accent: '#aa66ff', bg: '#050008', fog: '#080011', wall: '#330055', player: '#aa66ff', enemy: '#ffaa44', bullet: '#aa66ff', powerup: '#66ffaa' },
  { name: 'Solar Blaze', grid: '#442200', accent: '#ffaa44', bg: '#0a0500', fog: '#110800', wall: '#332200', player: '#ffaa44', enemy: '#44aaff', bullet: '#ffaa44', powerup: '#ff66aa' },
];

const SKINS = [
  { name: 'Neon Cyan', color: '#00ffff', emissive: '#00aaaa', unlock: 'default' },
  { name: 'Solar Flare', color: '#ff6600', emissive: '#aa4400', unlock: '100 kills' },
  { name: 'Plasma Pink', color: '#ff66ff', emissive: '#aa44aa', unlock: '10K score' },
  { name: 'Frost Core', color: '#66ccff', emissive: '#4488aa', unlock: '10 games' },
  { name: 'Toxic Green', color: '#66ff66', emissive: '#44aa44', unlock: 'x10 combo' },
  { name: 'Royal Gold', color: '#ffaa00', emissive: '#aa7700', unlock: 'Beat boss' },
  { name: 'Void Purple', color: '#aa66ff', emissive: '#7744aa', unlock: 'Stage 5' },
  { name: 'Inferno Red', color: '#ff4444', emissive: '#aa2222', unlock: 'All modes' },
];

const MODES = ['campaign', 'quickplay', 'timed', 'zen', 'daily', 'fever', 'precision', 'endless'] as const;
type GameMode = typeof MODES[number];

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_kill', name: 'First Blood', desc: 'Destroy your first enemy', check: s => s.totalKills >= 1 },
  { id: 'kill_50', name: 'Ace Pilot', desc: 'Destroy 50 enemies total', check: s => s.totalKills >= 50 },
  { id: 'kill_200', name: 'Squadron Leader', desc: 'Destroy 200 enemies', check: s => s.totalKills >= 200 },
  { id: 'kill_500', name: 'Fleet Commander', desc: '500 total kills', check: s => s.totalKills >= 500 },
  { id: 'kill_1000', name: 'Destroyer of Worlds', desc: '1000 total kills', check: s => s.totalKills >= 1000 },
  { id: 'score_5k', name: 'Rising Star', desc: 'Score 5,000 points', check: s => s.highScores.some(h => h.score >= 5000) },
  { id: 'score_25k', name: 'Neon Legend', desc: 'Score 25,000 points', check: s => s.highScores.some(h => h.score >= 25000) },
  { id: 'score_50k', name: 'Galactic Hero', desc: '50,000 points in one run', check: s => s.highScores.some(h => h.score >= 50000) },
  { id: 'score_100k', name: 'Cosmic Champion', desc: '100K points', check: s => s.highScores.some(h => h.score >= 100000) },
  { id: 'combo_5', name: 'Combo Starter', desc: 'Get a x5 combo', check: s => s.maxCombo >= 5 },
  { id: 'combo_10', name: 'Chain Master', desc: 'Get a x10 combo', check: s => s.maxCombo >= 10 },
  { id: 'combo_20', name: 'Combo King', desc: 'Get a x20 combo', check: s => s.maxCombo >= 20 },
  { id: 'combo_50', name: 'Unstoppable', desc: 'x50 combo', check: s => s.maxCombo >= 50 },
  { id: 'boss_1', name: 'Boss Slayer', desc: 'Defeat a boss', check: s => s.totalBossKills >= 1 },
  { id: 'boss_5', name: 'Boss Hunter', desc: 'Defeat 5 bosses', check: s => s.totalBossKills >= 5 },
  { id: 'boss_10', name: 'Nemesis', desc: 'Defeat 10 bosses', check: s => s.totalBossKills >= 10 },
  { id: 'games_5', name: 'Regular', desc: 'Play 5 games', check: s => s.totalGames >= 5 },
  { id: 'games_20', name: 'Veteran', desc: 'Play 20 games', check: s => s.totalGames >= 20 },
  { id: 'games_50', name: 'Dedicated', desc: 'Play 50 games', check: s => s.totalGames >= 50 },
  { id: 'stage_3', name: 'Sector 3', desc: 'Reach stage 3', check: s => s.maxStage >= 3 },
  { id: 'stage_5', name: 'Deep Space', desc: 'Reach stage 5', check: s => s.maxStage >= 5 },
  { id: 'stage_8', name: 'Final Frontier', desc: 'Reach stage 8', check: s => s.maxStage >= 8 },
  { id: 'powerup_10', name: 'Collector', desc: 'Collect 10 power-ups', check: s => s.totalPowerUps >= 10 },
  { id: 'powerup_50', name: 'Hoarder', desc: 'Collect 50 power-ups', check: s => s.totalPowerUps >= 50 },
  { id: 'shots_500', name: 'Trigger Happy', desc: 'Fire 500 shots', check: s => s.totalShots >= 500 },
  { id: 'shots_2000', name: 'Bullet Storm', desc: 'Fire 2000 shots', check: s => s.totalShots >= 2000 },
  { id: 'time_30', name: 'Time Invested', desc: 'Play for 30 minutes', check: s => s.totalPlayTime >= 1800 },
  { id: 'time_120', name: 'Marathon', desc: 'Play for 2 hours', check: s => s.totalPlayTime >= 7200 },
  { id: 'no_death', name: 'Untouchable', desc: 'Beat stage without dying', check: s => s.maxStage >= 2 },
  { id: 'level_5', name: 'Rank Up', desc: 'Reach level 5', check: s => s.level >= 5 },
  { id: 'level_10', name: 'Commander', desc: 'Reach level 10', check: s => s.level >= 10 },
  { id: 'level_20', name: 'Admiral', desc: 'Reach level 20', check: s => s.level >= 20 },
  { id: 'all_modes', name: 'Versatile', desc: 'Play all 8 modes', check: s => s.totalGames >= 8 },
  { id: 'skin_3', name: 'Fashion Pilot', desc: 'Unlock 3 skins', check: s => s.unlockedSkins.length >= 3 },
  { id: 'skin_all', name: 'Full Wardrobe', desc: 'Unlock all skins', check: s => s.unlockedSkins.length >= 8 },
  { id: 'perfect_acc', name: 'Sharpshooter', desc: '90%+ accuracy in a run', check: s => s.maxCombo >= 5 },
  { id: 'death_0', name: 'Flawless', desc: 'Complete a stage without damage', check: s => s.maxStage >= 1 },
  { id: 'speed_clear', name: 'Speed Runner', desc: 'Clear stage in under 60s', check: s => s.maxStage >= 1 },
  { id: 'daily_1', name: 'Daily Challenger', desc: 'Complete a daily run', check: s => s.totalGames >= 1 },
  { id: 'fever_master', name: 'Fever Master', desc: 'Score 10K in fever mode', check: s => s.highScores.some(h => h.score >= 10000 && h.mode === 'fever') },
  { id: 'zen_10min', name: 'Inner Peace', desc: 'Play zen mode 10 min', check: s => s.totalPlayTime >= 600 },
  { id: 'precision_50', name: 'Surgical Strike', desc: '50% hit rate in precision', check: s => s.totalShots >= 100 },
  // New achievements
  { id: 'graze_10', name: 'Daredevil', desc: 'Graze 10 bullets total', check: s => s.totalGrazes >= 10 },
  { id: 'graze_50', name: 'Bullet Dancer', desc: 'Graze 50 bullets total', check: s => s.totalGrazes >= 50 },
  { id: 'graze_200', name: 'Death Wish', desc: 'Graze 200 bullets total', check: s => s.totalGrazes >= 200 },
  { id: 'graze_streak_5', name: 'Close Calls', desc: '5 grazes in one run', check: s => s.maxGrazeStreak >= 5 },
  { id: 'graze_streak_20', name: 'Untouchable Dancer', desc: '20 grazes in one run', check: s => s.maxGrazeStreak >= 20 },
  { id: 'miniboss_1', name: 'Elite Hunter', desc: 'Defeat a mini-boss', check: s => s.totalMiniBossKills >= 1 },
  { id: 'miniboss_10', name: 'Elite Slayer', desc: 'Defeat 10 mini-bosses', check: s => s.totalMiniBossKills >= 10 },
  { id: 'asteroid_10', name: 'Rock Breaker', desc: 'Destroy 10 asteroids', check: s => s.totalAsteroidsDestroyed >= 10 },
  { id: 'asteroid_50', name: 'Asteroid Miner', desc: 'Destroy 50 asteroids', check: s => s.totalAsteroidsDestroyed >= 50 },
  { id: 'drone_kills_25', name: 'Drone Commander', desc: '25 kills from drones', check: s => s.totalDroneKills >= 25 },
  { id: 'charge_10', name: 'Charge Master', desc: 'Fire 10 charge shots', check: s => s.totalChargeShots >= 10 },
  { id: 'charge_50', name: 'Mega Blaster', desc: 'Fire 50 charge shots', check: s => s.totalChargeShots >= 50 },
  { id: 'stage_12', name: 'Warp Core', desc: 'Reach stage 12', check: s => s.maxStage >= 12 },
  { id: 'kill_2500', name: 'Extinction Event', desc: '2500 total kills', check: s => s.totalKills >= 2500 },
  { id: 'score_250k', name: 'Score Lord', desc: '250K in a single run', check: s => s.highScores.some(h => h.score >= 250000) },
  { id: 'level_50', name: 'Grand Admiral', desc: 'Reach level 50', check: s => s.level >= 50 },
  { id: 'bomb_5', name: 'Bombardier', desc: 'Deploy 5 bombs total', check: s => s.totalBombs >= 5 },
  { id: 'bomb_20', name: 'Nuclear Option', desc: 'Deploy 20 bombs total', check: s => s.totalBombs >= 20 },
  { id: 'magnet_10', name: 'Magnetic Personality', desc: 'Collect 10 magnets', check: s => s.totalMagnets >= 10 },
  { id: 'kill_5000', name: 'Apocalypse', desc: '5000 total kills', check: s => s.totalKills >= 5000 },
  { id: 'score_500k', name: 'Million Dollar Baby', desc: '500K in a single run', check: s => s.highScores.some(h => h.score >= 500000) },
];

const DIFFICULTY_MULT: Record<Difficulty, { speed: number; hp: number; fire: number; spawn: number }> = {
  easy: { speed: 0.7, hp: 0.7, fire: 0.5, spawn: 0.7 },
  normal: { speed: 1.0, hp: 1.0, fire: 1.0, spawn: 1.0 },
  hard: { speed: 1.3, hp: 1.5, fire: 1.5, spawn: 1.3 },
  insane: { speed: 1.6, hp: 2.0, fire: 2.0, spawn: 1.6 },
};

// ─── Save / Load ────────────────────────────────────────────────────
const SAVE_KEY = 'neon-rush-save';

function defaultSave(): SaveData {
  return {
    highScores: [], totalKills: 0, totalShots: 0, totalDeaths: 0,
    totalGames: 0, totalPlayTime: 0, totalPowerUps: 0, totalBossKills: 0,
    totalGrazes: 0, totalMiniBossKills: 0, totalAsteroidsDestroyed: 0,
    totalDroneKills: 0, totalChargeShots: 0, totalCarrierKills: 0, totalBombs: 0, totalMagnets: 0,
    maxCombo: 0, maxStage: 0, maxGrazeStreak: 0,
    achievements: [], unlockedSkins: ['Neon Cyan'],
    selectedSkin: 0, selectedTheme: 0, xp: 0, level: 1,
    settings: { sfx: true, music: true, particles: true, screenShake: true },
  };
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { const d = JSON.parse(raw) as SaveData; return { ...defaultSave(), ...d }; }
  } catch { /* ignore */ }
  return defaultSave();
}

function writeSave(data: SaveData) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function checkAchievements(save: SaveData): string[] {
  const newAch: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!save.achievements.includes(a.id) && a.check(save)) {
      save.achievements.push(a.id);
      newAch.push(a.name);
    }
  }
  return newAch;
}

function addXp(save: SaveData, amount: number): boolean {
  save.xp += amount;
  let leveled = false;
  while (save.xp >= save.level * XP_PER_LEVEL) {
    save.xp -= save.level * XP_PER_LEVEL;
    save.level++;
    leveled = true;
  }
  return leveled;
}

// ─── Audio Engine ───────────────────────────────────────────────────
class AudioEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  init() { try { this.ctx = new AudioContext(); } catch { /* no audio */ } }

  setEnabled(v: boolean) { this.enabled = v; }

  play(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.15) {
    if (!this.ctx || !this.enabled) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch { /* ignore */ }
  }

  shoot() { this.play(880, 0.08, 'square', 0.1); }
  hit() { this.play(440, 0.12, 'sawtooth', 0.12); }
  explosion() { this.play(120, 0.3, 'sawtooth', 0.15); }
  powerup() { this.play(660, 0.15, 'sine', 0.12); this.play(880, 0.15, 'sine', 0.1); }
  bossWarning() { this.play(220, 0.5, 'square', 0.15); }
  death() { this.play(200, 0.4, 'sawtooth', 0.15); }
  menuClick() { this.play(600, 0.06, 'square', 0.08); }
  achievement() { this.play(523, 0.15, 'sine', 0.12); this.play(659, 0.15, 'sine', 0.1); this.play(784, 0.2, 'sine', 0.1); }
  countdown() { this.play(440, 0.1, 'square', 0.1); }
  gameOver() { this.play(330, 0.3, 'sawtooth', 0.12); this.play(220, 0.5, 'sawtooth', 0.1); }
  graze() { this.play(1200, 0.06, 'sine', 0.08); }
  chargeLoop(pct: number) { this.play(300 + pct * 600, 0.08, 'sine', 0.06); }
  chargeRelease() { this.play(900, 0.2, 'sawtooth', 0.15); this.play(1100, 0.15, 'square', 0.1); }
  miniBossWarning() { this.play(300, 0.3, 'square', 0.12); this.play(250, 0.3, 'square', 0.1); }
  asteroidBreak() { this.play(180, 0.15, 'sawtooth', 0.1); }
  droneAttach() { this.play(700, 0.1, 'sine', 0.1); this.play(900, 0.1, 'sine', 0.08); }
  bomb() { this.play(100, 0.5, 'sawtooth', 0.2); this.play(60, 0.8, 'square', 0.15); this.play(200, 0.3, 'sine', 0.1); }
  magnetPickup() { this.play(500, 0.12, 'sine', 0.1); this.play(700, 0.1, 'sine', 0.08); this.play(900, 0.08, 'sine', 0.06); }
  sniperShot() { this.play(1600, 0.04, 'square', 0.08); this.play(800, 0.06, 'sawtooth', 0.06); }
  slowMotion() { this.play(200, 0.3, 'sine', 0.08); }
}

// ─── Game Manager ───────────────────────────────────────────────────
class GameManager {
  world!: World;
  scene!: Object3D & { fog?: FogExp2; background?: Color };
  audio = new AudioEngine();
  save: SaveData;
  state: GameState = 'title';
  mode: GameMode = 'campaign';
  difficulty: Difficulty = 'normal';
  score = 0;
  combo = 0;
  comboTimer = 0;
  stage = 1;
  stageTimer = 0;
  stageKills = 0;
  stageKillTarget = 15;
  gameTime = 0;
  countdownVal = 3;
  countdownTimer = 0;
  shotsHit = 0;

  // entities
  player: PlayerState = this.defaultPlayer();
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  powerUps: PowerUp[] = [];
  particles: Particle[] = [];
  asteroids: Asteroid[] = [];
  boss: BossState = { active: false, phase: 0, hp: 0, maxHp: 0, timer: 0, patternTimer: 0, enemy: null };
  spawnTimer = 0;
  scrollOffset = 0;
  asteroidTimer = 0;
  miniBossWave = false;

  // scene objects
  gameRoot!: Group;
  gridLines: Mesh[] = [];
  starField: Mesh[] = [];
  starLayers: { meshes: Mesh[]; speed: number; }[] = [];
  debris: Debris[] = [];
  engineTrail: TrailParticle[] = [];

  // screen shake
  shakeIntensity = 0;
  shakeDecay = 0.92;
  shakeOffsetX = 0;
  shakeOffsetY = 0;

  // slow motion
  slowMotion = false;
  slowMotionTimer = 0;
  slowMotionFactor = 1;

  // score popups
  scorePopups: { x: number; y: number; text: string; life: number; mesh: Mesh }[] = [];

  // wave tracking
  waveNumber = 0;
  waveAnnounceTimer = 0;

  // stage transition
  stageTransitionTimer = 0;

  // daily seed
  dailySeed = 0;

  // fever multiplier
  feverMult = 1;

  // panel entities
  panelEntities: Map<string, Entity> = new Map();

  // toast queue
  toastQueue: string[] = [];
  toastTimer = 0;

  // warning indicators
  warningIndicators: { mesh: Mesh; y: number; life: number; }[] = [];

  // critical health flash
  criticalFlashTimer = 0;
  boundaryMeshes: Mesh[] = [];

  // stage clear celebration
  stageClearTimer = 0;
  stageClearActive = false;

  constructor() {
    this.save = loadSave();
  }

  defaultPlayer(): PlayerState {
    return {
      x: -FIELD_W / 2 + 1.5, y: 0,
      speed: PLAYER_SPEED,
      fireRate: FIRE_RATE, fireTimer: 0,
      weapon: 'normal', weaponLevel: 1, weaponTimer: 0,
      shielded: false, shieldTimer: 0,
      speedBoost: false, speedTimer: 0,
      lives: 3, invincible: false, invincTimer: 0,
      mesh: null, group: null, shieldMesh: null,
      chargeTime: 0, charging: false, chargeMesh: null,
      drones: [], droneCount: 0,
      grazeCount: 0, grazeTotal: 0,
      bombs: 3, magnetActive: false, magnetTimer: 0,
    };
  }

  getTheme() { return THEMES[this.save.selectedTheme] || THEMES[0]; }
  getSkin() { return SKINS[this.save.selectedSkin] || SKINS[0]; }

  // ─── Scene Setup ────────────────────────────────────────────────
  setupScene() {
    const theme = this.getTheme();
    this.scene = this.world.scene as unknown as Object3D & { fog?: FogExp2; background?: Color };
    this.scene.fog = new FogExp2(new Color(theme.fog).getHex(), 0.04);
    this.scene.background = new Color(theme.bg);

    this.gameRoot = new Group();
    this.gameRoot.position.set(0, 1.0, -3);
    this.gameRoot.scale.set(0.2, 0.2, 0.2);
    this.scene.add(this.gameRoot);

    // ambient + directional light
    const ambient = new AmbientLight(new Color(theme.accent).getHex(), 0.3);
    this.scene.add(ambient);
    const dirLight = new DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    // grid floor
    this.createGrid(theme);
    // star field
    this.createStarField();
    // boundary walls
    this.createBoundaries(theme);
  }

  createGrid(theme: { grid: string; accent: string }) {
    const gridGeo = new BoxGeometry(FIELD_W + 2, 0.001, FIELD_H + 2);
    const gridMat = new MeshBasicMaterial({ color: new Color(theme.grid).getHex(), transparent: true, opacity: 0.3 });
    const gridFloor = new Mesh(gridGeo, gridMat);
    gridFloor.position.set(0, -FIELD_H / 2 - 0.5, 0);
    this.gameRoot.add(gridFloor);

    // grid lines
    for (let i = -6; i <= 6; i++) {
      const lineGeo = new BoxGeometry(0.01, 0.001, FIELD_H + 2);
      const lineMat = new MeshBasicMaterial({ color: new Color(theme.accent).getHex(), transparent: true, opacity: 0.15 });
      const line = new Mesh(lineGeo, lineMat);
      line.position.set(i, -FIELD_H / 2 - 0.49, 0);
      this.gameRoot.add(line);
      this.gridLines.push(line);
    }
    for (let i = -4; i <= 4; i++) {
      const lineGeo = new BoxGeometry(FIELD_W + 2, 0.001, 0.01);
      const lineMat = new MeshBasicMaterial({ color: new Color(theme.accent).getHex(), transparent: true, opacity: 0.15 });
      const line = new Mesh(lineGeo, lineMat);
      line.position.set(0, -FIELD_H / 2 - 0.49, i);
      this.gameRoot.add(line);
    }
  }

  createStarField() {
    // 3-layer parallax: far dim stars, mid stars, near bright stars
    const layers = [
      { count: 50, minSize: 0.01, maxSize: 0.02, minOpacity: 0.15, maxOpacity: 0.3, speed: 0.1, zMin: -25, zMax: -35 },
      { count: 40, minSize: 0.02, maxSize: 0.04, minOpacity: 0.3, maxOpacity: 0.5, speed: 0.25, zMin: -15, zMax: -24 },
      { count: 25, minSize: 0.03, maxSize: 0.06, minOpacity: 0.5, maxOpacity: 0.8, speed: 0.5, zMin: -8, zMax: -14 },
    ];

    for (const layer of layers) {
      const meshes: Mesh[] = [];
      for (let i = 0; i < layer.count; i++) {
        const size = layer.minSize + Math.random() * (layer.maxSize - layer.minSize);
        const geo = new SphereGeometry(size, 4, 4);
        const opacity = layer.minOpacity + Math.random() * (layer.maxOpacity - layer.minOpacity);
        // Occasional colored star
        const isColored = Math.random() < 0.15;
        const color = isColored
          ? [0x88ccff, 0xffaa66, 0xaaffaa, 0xffaaff][Math.floor(Math.random() * 4)]
          : 0xffffff;
        const mat = new MeshBasicMaterial({ color, transparent: true, opacity });
        const star = new Mesh(geo, mat);
        star.position.set(
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 20 + 3,
          layer.zMin - Math.random() * (layer.zMax - layer.zMin),
        );
        this.scene.add(star);
        meshes.push(star);
        this.starField.push(star);
      }
      this.starLayers.push({ meshes, speed: layer.speed });
    }
  }

  // ─── Background Debris ─────────────────────────────────────────
  spawnDebris() {
    const theme = this.getTheme();
    const group = new Group();
    const shapes = ['box', 'octahedron', 'icosahedron', 'torus'] as const;
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    let mesh: Mesh;
    const size = 0.1 + Math.random() * 0.25;
    const mat = new MeshStandardMaterial({
      color: new Color(theme.wall).getHex(),
      emissive: new Color(theme.grid).getHex(),
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.25 + Math.random() * 0.2,
      metalness: 0.6,
      roughness: 0.4,
    });
    switch (shape) {
      case 'box': mesh = new Mesh(new BoxGeometry(size, size, size), mat); break;
      case 'octahedron': mesh = new Mesh(new OctahedronGeometry(size * 0.7), mat); break;
      case 'icosahedron': mesh = new Mesh(new IcosahedronGeometry(size * 0.6, 0), mat); break;
      case 'torus': mesh = new Mesh(new TorusGeometry(size * 0.5, size * 0.15, 6, 8), mat); break;
    }
    group.add(mesh);
    const x = FIELD_W / 2 + 3 + Math.random() * 2;
    const y = (Math.random() - 0.5) * (FIELD_H + 4);
    group.position.set(x, y, -1 - Math.random() * 3);
    this.gameRoot.add(group);
    const debris: Debris = {
      mesh, group, x, y,
      vx: -(SCROLL_SPEED * 0.3 + Math.random() * 0.5),
      rotSpeed: (Math.random() - 0.5) * 4,
      active: true,
    };
    this.debris.push(debris);
  }

  createBoundaries(theme: { wall: string }) {
    const wallMat = new MeshStandardMaterial({
      color: new Color(theme.wall).getHex(),
      emissive: new Color(theme.wall).getHex(),
      emissiveIntensity: 0.3,
      transparent: true, opacity: 0.4,
    });
    // top/bottom walls
    const topWall = new Mesh(new BoxGeometry(FIELD_W + 2, 0.08, 0.08), wallMat);
    topWall.position.set(0, FIELD_H / 2, 0);
    this.gameRoot.add(topWall);
    const botWall = new Mesh(new BoxGeometry(FIELD_W + 2, 0.08, 0.08), wallMat.clone());
    botWall.position.set(0, -FIELD_H / 2, 0);
    this.gameRoot.add(botWall);
    // left wall
    const leftWall = new Mesh(new BoxGeometry(0.08, FIELD_H + 0.08, 0.08), wallMat.clone());
    leftWall.position.set(-FIELD_W / 2 - 0.04, 0, 0);
    this.gameRoot.add(leftWall);
  }

  // ─── Player Ship ───────────────────────────────────────────────
  createPlayerShip() {
    const skin = this.getSkin();
    const group = new Group();
    // body - arrow shape using box
    const bodyGeo = new BoxGeometry(0.5, 0.12, 0.25);
    const bodyMat = new MeshStandardMaterial({
      color: new Color(skin.color).getHex(),
      emissive: new Color(skin.emissive).getHex(),
      emissiveIntensity: 0.8,
      metalness: 0.8, roughness: 0.2,
    });
    const body = new Mesh(bodyGeo, bodyMat);
    group.add(body);

    // nose cone (cylinder with 0 top radius)
    const noseGeo = new CylinderGeometry(0, 0.12, 0.3, 4);
    const noseMat = bodyMat.clone();
    const nose = new Mesh(noseGeo, noseMat);
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 0.35;
    group.add(nose);

    // wings
    const wingGeo = new BoxGeometry(0.25, 0.03, 0.6);
    const wingMat = bodyMat.clone();
    wingMat.emissiveIntensity = 0.5;
    const wings = new Mesh(wingGeo, wingMat);
    wings.position.x = -0.05;
    group.add(wings);

    // engine glow
    const engineGeo = new SphereGeometry(0.08, 8, 8);
    const engineMat = new MeshBasicMaterial({
      color: new Color(skin.color).getHex(),
      transparent: true, opacity: 0.7,
    });
    const engine = new Mesh(engineGeo, engineMat);
    engine.position.x = -0.35;
    group.add(engine);

    // shield mesh (hidden initially)
    const shieldGeo = new SphereGeometry(0.45, 12, 12);
    const shieldMat = new MeshBasicMaterial({
      color: 0x44aaff, transparent: true, opacity: 0.0,
      blending: AdditiveBlending,
    });
    const shieldMesh = new Mesh(shieldGeo, shieldMat);
    group.add(shieldMesh);

    // charge indicator mesh (hidden initially)
    const chargeGeo = new SphereGeometry(0.06, 8, 8);
    const chargeMat = new MeshBasicMaterial({
      color: 0xffff00, transparent: true, opacity: 0.0,
      blending: AdditiveBlending,
    });
    const chargeMesh = new Mesh(chargeGeo, chargeMat);
    chargeMesh.position.x = 0.5;
    group.add(chargeMesh);

    group.position.set(this.player.x, this.player.y, 0);
    this.gameRoot.add(group);
    this.player.mesh = body;
    this.player.group = group;
    this.player.shieldMesh = shieldMesh;
    this.player.chargeMesh = chargeMesh;
  }

  removePlayerShip() {
    if (this.player.group) {
      this.gameRoot.remove(this.player.group);
      this.player.group = null;
      this.player.mesh = null;
      this.player.shieldMesh = null;
      this.player.chargeMesh = null;
    }
    // remove drones
    for (const d of this.player.drones) {
      if (d.group.parent) this.gameRoot.remove(d.group);
    }
    this.player.drones = [];
  }

  // ─── Orbiting Drones ──────────────────────────────────────────
  addDrone() {
    if (this.player.drones.length >= 4) return; // max 4 drones
    const skin = this.getSkin();
    const group = new Group();
    const bodyGeo = new SphereGeometry(0.1, 8, 8);
    const bodyMat = new MeshStandardMaterial({
      color: new Color(skin.color).getHex(),
      emissive: new Color(skin.emissive).getHex(),
      emissiveIntensity: 1.0,
      metalness: 0.9, roughness: 0.1,
    });
    const mesh = new Mesh(bodyGeo, bodyMat);
    group.add(mesh);

    // glow ring around drone
    const ringGeo = new TorusGeometry(0.14, 0.015, 6, 12);
    const ringMat = new MeshBasicMaterial({
      color: new Color(skin.color).getHex(),
      transparent: true, opacity: 0.4,
      blending: AdditiveBlending,
    });
    group.add(new Mesh(ringGeo, ringMat));

    this.gameRoot.add(group);
    const angleOffset = (this.player.drones.length * Math.PI * 2) / Math.max(1, this.player.drones.length + 1);
    const drone: Drone = { mesh, group, angle: angleOffset, fireTimer: 0.5 + Math.random() * 0.5, active: true };
    this.player.drones.push(drone);
    this.player.droneCount++;

    // redistribute angles evenly
    for (let i = 0; i < this.player.drones.length; i++) {
      this.player.drones[i].angle = (i * Math.PI * 2) / this.player.drones.length;
    }

    this.audio.droneAttach();
    this.showToast('DRONE ATTACHED! (' + this.player.drones.length + '/4)');
  }

  updateDrones(dt: number) {
    const orbitRadius = 0.6;
    const orbitSpeed = 2.5;
    const theme = this.getTheme();

    for (const d of this.player.drones) {
      if (!d.active) continue;
      d.angle += orbitSpeed * dt;
      const dx = Math.cos(d.angle) * orbitRadius;
      const dy = Math.sin(d.angle) * orbitRadius;
      d.group.position.set(this.player.x + dx, this.player.y + dy, 0);
      d.mesh.rotation.y += dt * 5;

      // auto-fire
      d.fireTimer -= dt;
      if (d.fireTimer <= 0) {
        d.fireTimer = 0.8; // fire every 0.8s
        this.createBullet(
          this.player.x + dx + 0.15, this.player.y + dy,
          BULLET_SPEED * 0.8, 0, true, 1
        );
        this.save.totalDroneKills++; // approximate — counted as drone bullet
      }
    }
  }

  // ─── Asteroids ────────────────────────────────────────────────
  spawnAsteroid() {
    const theme = this.getTheme();
    const group = new Group();
    const size = 0.2 + Math.random() * 0.4;
    const geo = new IcosahedronGeometry(size, 0);
    const mat = new MeshStandardMaterial({
      color: 0x666666,
      emissive: new Color(theme.wall).getHex(),
      emissiveIntensity: 0.3,
      metalness: 0.5, roughness: 0.7,
    });
    const mesh = new Mesh(geo, mat);

    // add wireframe edges
    const edgeGeo = new EdgesGeometry(geo);
    const edgeMat = new MeshBasicMaterial({ color: new Color(theme.accent).getHex(), transparent: true, opacity: 0.3 });
    const edges = new LineSegments(edgeGeo, edgeMat);
    group.add(mesh);
    group.add(edges);

    const x = FIELD_W / 2 + 2;
    const y = (Math.random() - 0.5) * FIELD_H;
    group.position.set(x, y, 0);
    this.gameRoot.add(group);

    const asteroid: Asteroid = {
      mesh, group, x, y,
      vx: -(SCROLL_SPEED * 0.5 + Math.random() * 1.5),
      vy: (Math.random() - 0.5) * 1.0,
      rotSpeed: (Math.random() - 0.5) * 3,
      hp: Math.ceil(size * 5),
      size,
      active: true,
    };
    this.asteroids.push(asteroid);
  }

  updateAsteroids(dt: number) {
    for (const a of this.asteroids) {
      if (!a.active) continue;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.group.position.set(a.x, a.y, 0);
      a.mesh.rotation.x += a.rotSpeed * dt;
      a.mesh.rotation.z += a.rotSpeed * 0.7 * dt;

      if (a.x < -FIELD_W / 2 - 3) { a.active = false; a.group.visible = false; }
    }

    // bullet-asteroid collision
    for (const b of this.bullets) {
      if (!b.active || !b.isPlayer) continue;
      for (const a of this.asteroids) {
        if (!a.active) continue;
        if (Math.abs(b.x - a.x) < a.size + 0.1 && Math.abs(b.y - a.y) < a.size + 0.1) {
          b.active = false; b.mesh.visible = false;
          a.hp -= b.damage;
          this.spawnParticles(b.x, b.y, 0x888888, 3);
          if (a.hp <= 0) {
            a.active = false; a.group.visible = false;
            this.score += 150;
            this.save.totalAsteroidsDestroyed++;
            this.audio.asteroidBreak();
            this.spawnParticles(a.x, a.y, 0xaaaaaa, 8);
            this.triggerShake(0.4);
            // chance to spawn power-up
            if (Math.random() < 0.3) this.spawnPowerUp(a.x, a.y);
          }
        }
      }
    }

    // asteroid-player collision
    if (!this.player.invincible) {
      for (const a of this.asteroids) {
        if (!a.active) continue;
        if (Math.abs(a.x - this.player.x) < a.size + 0.2 && Math.abs(a.y - this.player.y) < a.size + 0.15) {
          if (this.player.shielded) {
            this.player.shielded = false;
            this.player.shieldTimer = 0;
            a.hp -= 5;
            if (a.hp <= 0) { a.active = false; a.group.visible = false; this.save.totalAsteroidsDestroyed++; }
          } else {
            this.hitPlayer();
          }
        }
      }
    }

    // cleanup
    this.asteroids = this.asteroids.filter(a => {
      if (!a.active) { if (a.group.parent) this.gameRoot.remove(a.group); return false; }
      return true;
    });
  }

  // ─── Graze System ────────────────────────────────────────────
  checkGrazes() {
    const grazeRadius = 0.5; // graze detection radius
    const hitRadius = 0.25; // actual hit radius

    for (const b of this.bullets) {
      if (!b.active || b.isPlayer) continue;
      const dx = b.x - this.player.x;
      const dy = b.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // within graze zone but not hit zone, and bullet is passing by (moving away or alongside)
      if (dist < grazeRadius && dist > hitRadius) {
        // mark bullet as grazed (use vy as flag — hacky but avoids adding properties)
        const bulletKey = Math.round(b.x * 100) + Math.round(b.y * 100) * 10000;
        if (!(b as unknown as { _grazed?: boolean })._grazed) {
          (b as unknown as { _grazed?: boolean })._grazed = true;
          this.player.grazeCount++;
          this.player.grazeTotal++;
          this.save.totalGrazes++;
          if (this.player.grazeTotal > this.save.maxGrazeStreak) {
            this.save.maxGrazeStreak = this.player.grazeTotal;
          }
          this.score += 50 * (1 + Math.floor(this.player.grazeCount / 5));
          this.audio.graze();
          // visual graze spark
          this.spawnParticles(this.player.x, this.player.y, 0xffffff, 2);
          if (this.player.grazeCount % 10 === 0) {
            this.showToast('GRAZE x' + this.player.grazeCount + '!');
            // Trigger brief slow-motion on graze milestones
            this.activateSlowMotion(0.5);
          }
        }
      }
    }
  }

  // ─── Charge Shot ──────────────────────────────────────────────
  updateCharge(dt: number, holding: boolean) {
    if (holding && this.state === 'playing') {
      this.player.charging = true;
      this.player.chargeTime = Math.min(this.player.chargeTime + dt, 2.0); // 2s max charge

      // visual charge indicator
      if (this.player.chargeMesh) {
        const pct = this.player.chargeTime / 2.0;
        const scale = 0.5 + pct * 2.0;
        this.player.chargeMesh.scale.set(scale, scale, scale);
        (this.player.chargeMesh.material as MeshBasicMaterial).opacity = pct * 0.8;
        const hue = pct < 0.5 ? 0xffff00 : (pct < 1.0 ? 0xff8800 : 0xff0000);
        (this.player.chargeMesh.material as MeshBasicMaterial).color.set(hue);
      }

      // sound feedback at thresholds
      if (Math.floor(this.player.chargeTime * 4) !== Math.floor((this.player.chargeTime - dt) * 4)) {
        this.audio.chargeLoop(this.player.chargeTime / 2.0);
      }
    } else if (this.player.charging) {
      // release charge
      this.player.charging = false;
      if (this.player.chargeTime >= 0.5) {
        this.fireChargeShot();
      }
      this.player.chargeTime = 0;
      if (this.player.chargeMesh) {
        this.player.chargeMesh.scale.set(1, 1, 1);
        (this.player.chargeMesh.material as MeshBasicMaterial).opacity = 0;
      }
    }
  }

  fireChargeShot() {
    const pct = this.player.chargeTime / 2.0;
    const damage = Math.ceil(3 + pct * 12); // 3-15 damage
    const px = this.player.x + 0.5;
    const py = this.player.y;
    this.save.totalChargeShots++;

    // big charge bullet
    const theme = this.getTheme();
    const size = 0.08 + pct * 0.15;
    const geo = new SphereGeometry(size, 8, 8);
    const mat = new MeshBasicMaterial({
      color: pct >= 1.0 ? 0xff4444 : (pct >= 0.5 ? 0xff8800 : 0xffff00),
      transparent: true, opacity: 0.9,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(px, py, 0);
    this.gameRoot.add(mesh);
    const bullet: Bullet = { mesh, x: px, y: py, vx: BULLET_SPEED * 1.3, vy: 0, damage, isPlayer: true, active: true };
    this.bullets.push(bullet);

    this.audio.chargeRelease();
    this.triggerShake(0.3 + pct * 0.5);
    this.spawnParticles(px, py, 0xffaa00, 6);
    if (pct >= 1.0) this.showToast('MAX CHARGE!');
  }

  // ─── Bomb System ─────────────────────────────────────────────
  deployBomb() {
    if (this.player.bombs <= 0 || this.state !== 'playing') return;
    this.player.bombs--;
    this.save.totalBombs++;
    this.audio.bomb();
    this.triggerShake(3.0);

    // Kill all visible enemies (except bosses — just damage them)
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (e.type === 'boss') {
        e.hp -= 20;
        this.spawnParticles(e.x, e.y, 0xffaa00, 15);
        if (e.hp <= 0) { e.active = false; e.group.visible = false; }
      } else {
        this.score += e.points;
        this.save.totalKills++;
        e.active = false;
        e.group.visible = false;
        this.spawnParticles(e.x, e.y, 0xffffff, 6);
        this.spawnScorePopup(e.x, e.y, e.points);
      }
    }

    // Destroy all asteroids
    for (const a of this.asteroids) {
      if (!a.active) continue;
      a.active = false;
      a.group.visible = false;
      this.save.totalAsteroidsDestroyed++;
      this.spawnParticles(a.x, a.y, 0xaaaaaa, 4);
    }

    // Clear all enemy bullets
    for (const b of this.bullets) {
      if (!b.active || b.isPlayer) continue;
      b.active = false;
      b.mesh.visible = false;
    }

    // Big screen flash effect — radial particles from player
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24;
      const radius = 1 + Math.random() * 2;
      this.spawnParticles(
        this.player.x + Math.cos(angle) * radius,
        this.player.y + Math.sin(angle) * radius,
        0xffffff, 3
      );
    }

    this.showToast('BOMB! (' + this.player.bombs + ' left)');

    // Slow motion after bomb
    this.activateSlowMotion(0.8);
  }

  // ─── Slow Motion ──────────────────────────────────────────────
  activateSlowMotion(duration: number) {
    this.slowMotion = true;
    this.slowMotionTimer = duration;
    this.slowMotionFactor = 0.3; // 30% game speed
    this.audio.slowMotion();
  }

  updateSlowMotion(dt: number): number {
    if (this.slowMotion) {
      this.slowMotionTimer -= dt;
      if (this.slowMotionTimer <= 0) {
        this.slowMotion = false;
        this.slowMotionFactor = 1;
      }
      return dt * this.slowMotionFactor;
    }
    return dt;
  }

  // ─── Score Popup ──────────────────────────────────────────────
  spawnScorePopup(x: number, y: number, points: number) {
    const theme = this.getTheme();
    // Use a small sphere as a score indicator — rises and fades
    const geo = new SphereGeometry(0.04, 4, 4);
    const color = points >= 1000 ? 0xffaa00 : (points >= 300 ? 0x44ff44 : 0xffffff);
    const mat = new MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: AdditiveBlending });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(x, y, 0);
    this.gameRoot.add(mesh);
    this.scorePopups.push({ x, y, text: '+' + points, life: 0.8, mesh });
  }

  updateScorePopups(dt: number) {
    for (const p of this.scorePopups) {
      p.life -= dt;
      p.y += 2 * dt;
      p.mesh.position.set(p.x, p.y, 0);
      const alpha = Math.max(0, p.life / 0.8);
      (p.mesh.material as MeshBasicMaterial).opacity = alpha;
      const s = 0.5 + alpha * 0.5;
      p.mesh.scale.set(s, s, s);
    }
    this.scorePopups = this.scorePopups.filter(p => {
      if (p.life <= 0) { if (p.mesh.parent) this.gameRoot.remove(p.mesh); return false; }
      return true;
    });
  }

  // ─── Magnet Update ────────────────────────────────────────────
  updateMagnet(dt: number) {
    if (!this.player.magnetActive) return;
    this.player.magnetTimer -= dt;
    if (this.player.magnetTimer <= 0) {
      this.player.magnetActive = false;
      return;
    }
    // Attract power-ups toward player
    const magnetRange = 4.0;
    const attractSpeed = 6.0;
    for (const pu of this.powerUps) {
      if (!pu.active) continue;
      const dx = this.player.x - pu.x;
      const dy = this.player.y - pu.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < magnetRange && dist > 0.1) {
        const factor = (1 - dist / magnetRange) * attractSpeed;
        pu.x += (dx / dist) * factor * dt;
        pu.y += (dy / dist) * factor * dt;
      }
    }
  }

  // ─── Mini-Boss ────────────────────────────────────────────────
  spawnMiniBoss() {
    this.audio.miniBossWarning();
    this.showToast('ELITE INCOMING!');
    const halfH = FIELD_H / 2 - 0.5;
    const rightEdge = FIELD_W / 2 + 1;
    const y = (Math.random() - 0.5) * halfH;

    const theme = this.getTheme();
    const diff = DIFFICULTY_MULT[this.difficulty];
    const group = new Group();
    const mat = new MeshStandardMaterial({
      color: 0xff8800, emissive: 0xaa4400, emissiveIntensity: 0.8,
      metalness: 0.8, roughness: 0.2,
    });
    const mesh = new Mesh(new BoxGeometry(0.7, 0.35, 0.35), mat);
    group.add(mesh);

    // wing detail
    const wMat = mat.clone();
    wMat.color = new Color(0xffaa44);
    const wing = new Mesh(new BoxGeometry(0.3, 0.04, 0.7), wMat);
    group.add(wing);

    // engine glows
    for (const oy of [-0.2, 0.2]) {
      const eMat = new MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.6 });
      const engine = new Mesh(new SphereGeometry(0.06, 6, 6), eMat);
      engine.position.set(-0.4, 0, oy);
      group.add(engine);
    }

    group.position.set(rightEdge, y, 0);
    this.gameRoot.add(group);

    const hp = Math.ceil((12 + this.stage * 4) * diff.hp);
    const enemy: Enemy = {
      mesh, group, type: 'tank', // use tank type for behavior
      x: rightEdge, y,
      vx: -SCROLL_SPEED * 0.6 * diff.speed,
      vy: 0,
      hp, maxHp: hp,
      points: 1500,
      timer: 0, baseY: y,
      fireTimer: 1.0,
      active: true,
    };
    this.enemies.push(enemy);
    this.miniBossWave = false;
  }

  // ─── Enemy Creation ──────────────────────────────────────────────
  createEnemy(type: EnemyType, x: number, y: number): Enemy {
    const theme = this.getTheme();
    const diff = DIFFICULTY_MULT[this.difficulty];
    const group = new Group();
    let mesh: Mesh;
    let hp = 1, points = 100;

    const eMat = new MeshStandardMaterial({
      color: new Color(theme.enemy).getHex(),
      emissive: new Color(theme.enemy).getHex(),
      emissiveIntensity: 0.6,
      metalness: 0.7, roughness: 0.3,
    });

    switch (type) {
      case 'straight': {
        mesh = new Mesh(new BoxGeometry(0.35, 0.15, 0.2), eMat);
        hp = 1; points = 100;
        break;
      }
      case 'sine': {
        mesh = new Mesh(new OctahedronGeometry(0.18), eMat.clone());
        hp = 1; points = 150;
        break;
      }
      case 'dive': {
        const diveMat = eMat.clone();
        diveMat.color = new Color('#ff8800');
        diveMat.emissive = new Color('#aa4400');
        mesh = new Mesh(new CylinderGeometry(0, 0.15, 0.35, 5), diveMat);
        mesh.rotation.z = Math.PI / 2;
        hp = 1; points = 200;
        break;
      }
      case 'circle': {
        mesh = new Mesh(new TorusGeometry(0.15, 0.05, 8, 12), eMat.clone());
        hp = 2; points = 250;
        break;
      }
      case 'formation': {
        mesh = new Mesh(new BoxGeometry(0.3, 0.12, 0.18), eMat.clone());
        hp = 1; points = 120;
        break;
      }
      case 'turret': {
        const tMat = eMat.clone();
        tMat.color = new Color('#ff4488');
        tMat.emissive = new Color('#aa2244');
        mesh = new Mesh(new CylinderGeometry(0.2, 0.2, 0.2, 6), tMat);
        // barrel
        const barrel = new Mesh(new BoxGeometry(0.3, 0.06, 0.06), tMat.clone());
        barrel.position.x = -0.2;
        group.add(barrel);
        hp = 3; points = 300;
        break;
      }
      case 'tank': {
        const tankMat = eMat.clone();
        tankMat.color = new Color('#ff2222');
        tankMat.emissive = new Color('#881111');
        mesh = new Mesh(new BoxGeometry(0.5, 0.25, 0.3), tankMat);
        hp = 5; points = 500;
        break;
      }
      case 'boss': {
        const bossMat = new MeshStandardMaterial({
          color: 0xff0044, emissive: 0xaa0022, emissiveIntensity: 0.8,
          metalness: 0.9, roughness: 0.1,
        });
        mesh = new Mesh(new BoxGeometry(1.2, 0.6, 0.5), bossMat);
        // wings
        const bWing = new Mesh(new BoxGeometry(0.4, 0.05, 0.8), bossMat.clone());
        group.add(bWing);
        // top turret
        const turret = new Mesh(new CylinderGeometry(0.15, 0.15, 0.15, 6), bossMat.clone());
        turret.position.set(0, 0.35, 0);
        group.add(turret);
        hp = 50 + this.stage * 20; points = 5000;
        break;
      }
      case 'sniper': {
        // Long thin enemy with a barrel — fires precise aimed shots
        const sniperMat = eMat.clone();
        sniperMat.color = new Color('#ff00ff');
        sniperMat.emissive = new Color('#880088');
        mesh = new Mesh(new BoxGeometry(0.45, 0.1, 0.12), sniperMat);
        // barrel
        const sBarrel = new Mesh(new CylinderGeometry(0.02, 0.04, 0.4, 6), sniperMat.clone());
        sBarrel.rotation.z = -Math.PI / 2;
        sBarrel.position.x = -0.35;
        group.add(sBarrel);
        // scope glow
        const scopeMat = new MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.6 });
        const scope = new Mesh(new SphereGeometry(0.04, 6, 6), scopeMat);
        scope.position.set(0, 0.08, 0);
        group.add(scope);
        hp = 2; points = 400;
        break;
      }
      case 'swarm': {
        // Tiny fast enemy that comes in groups
        const swarmMat = eMat.clone();
        swarmMat.color = new Color('#ffff44');
        swarmMat.emissive = new Color('#aaaa22');
        mesh = new Mesh(new OctahedronGeometry(0.08), swarmMat);
        hp = 1; points = 60;
        break;
      }
      case 'carrier': {
        // Large enemy that spawns smaller enemies on death
        const carrierMat = eMat.clone();
        carrierMat.color = new Color('#ff6600');
        carrierMat.emissive = new Color('#993300');
        mesh = new Mesh(new BoxGeometry(0.7, 0.35, 0.3), carrierMat);
        // side pods (spawn bays)
        const podMat = new MeshStandardMaterial({
          color: 0xffaa00, emissive: 0x885500,
          emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3,
        });
        const topPod = new Mesh(new SphereGeometry(0.1, 6, 6), podMat);
        topPod.position.set(-0.15, 0.25, 0);
        group.add(topPod);
        const botPod = new Mesh(new SphereGeometry(0.1, 6, 6), podMat.clone());
        botPod.position.set(-0.15, -0.25, 0);
        group.add(botPod);
        // engine glow
        const engMat = new MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.5 });
        const eng = new Mesh(new SphereGeometry(0.06, 6, 6), engMat);
        eng.position.set(-0.4, 0, 0);
        group.add(eng);
        hp = 8; points = 800;
        break;
      }
      default: {
        mesh = new Mesh(new BoxGeometry(0.3, 0.15, 0.2), eMat);
        hp = 1; points = 100;
      }
    }

    hp = Math.ceil(hp * diff.hp);
    group.add(mesh);
    group.position.set(x, y, 0);
    this.gameRoot.add(group);

    const enemy: Enemy = {
      mesh, group, type, x, y,
      vx: -(SCROLL_SPEED + 1) * diff.speed,
      vy: 0,
      hp, maxHp: hp, points,
      timer: 0, baseY: y,
      fireTimer: 2 + Math.random() * 3,
      active: true,
    };

    if (type === 'sine') enemy.vy = 0;
    if (type === 'circle') { enemy.vx = -SCROLL_SPEED * 0.5 * diff.speed; }
    if (type === 'turret') { enemy.vx = -SCROLL_SPEED * 0.3 * diff.speed; }
    if (type === 'tank') { enemy.vx = -SCROLL_SPEED * 0.6 * diff.speed; }
    if (type === 'boss') { enemy.vx = -SCROLL_SPEED * 0.3; }
    if (type === 'sniper') { enemy.vx = -SCROLL_SPEED * 0.4 * diff.speed; enemy.fireTimer = 1.5; }
    if (type === 'swarm') { enemy.vx = -(SCROLL_SPEED + 3) * diff.speed; }
    if (type === 'carrier') { enemy.vx = -SCROLL_SPEED * 0.5 * diff.speed; }

    this.enemies.push(enemy);
    return enemy;
  }

  // ─── Bullet Creation ───────────────────────────────────────────
  createBullet(x: number, y: number, vx: number, vy: number, isPlayer: boolean, damage = 1) {
    const theme = this.getTheme();
    const color = isPlayer ? new Color(theme.bullet).getHex() : new Color(theme.enemy).getHex();
    const geo = isPlayer
      ? new BoxGeometry(0.2, 0.04, 0.04)
      : new SphereGeometry(0.06, 6, 6);
    const mat = new MeshBasicMaterial({
      color, transparent: true, opacity: 0.9,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(x, y, 0);
    this.gameRoot.add(mesh);

    const bullet: Bullet = { mesh, x, y, vx, vy, damage, isPlayer, active: true };
    this.bullets.push(bullet);
    return bullet;
  }

  // ─── Power-Up Creation ─────────────────────────────────────────
  spawnPowerUp(x: number, y: number) {
    const types: PowerUpType[] = ['spread', 'laser', 'missile', 'shield', 'speed', 'magnet', 'bomb'];
    const type = types[Math.floor(Math.random() * types.length)];
    const group = new Group();

    const colors: Record<PowerUpType, number> = {
      spread: 0xff8800, laser: 0x00ff88, missile: 0xff4444,
      shield: 0x4488ff, speed: 0xffff00, magnet: 0xff44ff, bomb: 0xff0000,
    };

    const geo = new OctahedronGeometry(0.15);
    const mat = new MeshStandardMaterial({
      color: colors[type], emissive: colors[type],
      emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.3,
    });
    const mesh = new Mesh(geo, mat);
    group.add(mesh);

    // glow ring
    const ringGeo = new TorusGeometry(0.22, 0.02, 8, 16);
    const ringMat = new MeshBasicMaterial({
      color: colors[type], transparent: true, opacity: 0.5,
      blending: AdditiveBlending,
    });
    const ring = new Mesh(ringGeo, ringMat);
    group.add(ring);

    group.position.set(x, y, 0);
    this.gameRoot.add(group);

    const pu: PowerUp = { mesh, group, type, x, y, active: true, timer: 0 };
    this.powerUps.push(pu);
  }

  // ─── Particle System ───────────────────────────────────────────
  spawnParticles(x: number, y: number, color: number, count = 8) {
    if (!this.save.settings.particles) return;
    for (let i = 0; i < count; i++) {
      const geo = new BoxGeometry(0.04, 0.04, 0.04);
      const mat = new MeshBasicMaterial({
        color, transparent: true, opacity: 1,
        blending: AdditiveBlending,
      });
      const mesh = new Mesh(geo, mat);
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      mesh.position.set(x, y, 0);
      this.gameRoot.add(mesh);

      const p: Particle = {
        mesh, x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.6,
        active: true,
      };
      this.particles.push(p);
    }
  }

  // ─── Screen Shake ──────────────────────────────────────────────
  triggerShake(intensity: number) {
    if (!this.save.settings.screenShake) return;
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  updateShake(dt: number) {
    if (this.shakeIntensity > 0.01) {
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity * 0.15;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity * 0.15;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
    // Apply to game root
    if (this.gameRoot) {
      this.gameRoot.position.x = this.shakeOffsetX;
    }
  }

  // ─── Engine Trail ─────────────────────────────────────────────
  spawnEngineTrail() {
    if (!this.save.settings.particles || !this.player.group) return;
    const skin = this.getSkin();
    const geo = new BoxGeometry(0.03, 0.03, 0.03);
    const mat = new MeshBasicMaterial({
      color: new Color(skin.color).getHex(),
      transparent: true, opacity: 0.6,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(
      this.player.x - 0.4 + (Math.random() - 0.5) * 0.1,
      this.player.y + (Math.random() - 0.5) * 0.08,
      0
    );
    this.gameRoot.add(mesh);
    this.engineTrail.push({ mesh, life: 0.3 + Math.random() * 0.2, maxLife: 0.4, active: true });
  }

  updateEngineTrail(dt: number) {
    for (const t of this.engineTrail) {
      if (!t.active) continue;
      t.life -= dt;
      if (t.life <= 0) { t.active = false; t.mesh.visible = false; continue; }
      // drift left
      t.mesh.position.x -= SCROLL_SPEED * 0.6 * dt;
      const alpha = t.life / t.maxLife;
      (t.mesh.material as MeshBasicMaterial).opacity = alpha * 0.5;
      const s = alpha * 0.5 + 0.3;
      t.mesh.scale.set(s, s, s);
    }
    // cleanup
    this.engineTrail = this.engineTrail.filter(t => {
      if (!t.active) { if (t.mesh.parent) this.gameRoot.remove(t.mesh); return false; }
      return true;
    });
  }

  // ─── Warning Indicators ──────────────────────────────────────
  spawnWarning(y: number) {
    const geo = new CylinderGeometry(0, 0.12, 0.25, 3);
    const mat = new MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.8, blending: AdditiveBlending });
    const mesh = new Mesh(geo, mat);
    mesh.rotation.z = Math.PI / 2; // point left
    mesh.position.set(FIELD_W / 2 - 0.3, y, 0);
    this.gameRoot.add(mesh);
    this.warningIndicators.push({ mesh, y, life: 1.2 });
  }

  updateWarnings(dt: number) {
    for (const w of this.warningIndicators) {
      w.life -= dt;
      const alpha = 0.3 + Math.sin(w.life * 12) * 0.5; // pulsing
      (w.mesh.material as MeshBasicMaterial).opacity = Math.max(0, alpha);
      const s = 0.8 + Math.sin(w.life * 8) * 0.2;
      w.mesh.scale.set(s, s, s);
    }
    this.warningIndicators = this.warningIndicators.filter(w => {
      if (w.life <= 0) { if (w.mesh.parent) this.gameRoot.remove(w.mesh); return false; }
      return true;
    });
  }

  // ─── Critical Health ─────────────────────────────────────────
  updateCriticalHealth(dt: number) {
    if (this.player.lives <= 1 && this.state === 'playing' && !this.player.invincible) {
      this.criticalFlashTimer += dt;
      // Pulse boundary walls red
      const pulse = 0.3 + Math.sin(this.criticalFlashTimer * 4) * 0.3;
      for (const bm of this.boundaryMeshes) {
        const mat = bm.material as MeshBasicMaterial;
        mat.color.setHex(0xff2222);
        mat.opacity = pulse;
      }
    } else {
      // Reset boundary colors
      const theme = this.getTheme();
      for (const bm of this.boundaryMeshes) {
        const mat = bm.material as MeshBasicMaterial;
        mat.color = new Color(theme.accent);
        mat.opacity = 0.15;
      }
    }
  }

  // ─── Stage Clear ─────────────────────────────────────────────
  updateStageClear(dt: number) {
    if (!this.stageClearActive) return;
    this.stageClearTimer -= dt;
    if (this.stageClearTimer <= 0) {
      this.stageClearActive = false;
    }
  }

  // ─── Cleanup ────────────────────────────────────────────────────
  clearGameEntities() {
    for (const e of this.enemies) { if (e.group.parent) this.gameRoot.remove(e.group); }
    for (const b of this.bullets) { if (b.mesh.parent) this.gameRoot.remove(b.mesh); }
    for (const p of this.powerUps) { if (p.group.parent) this.gameRoot.remove(p.group); }
    for (const p of this.particles) { if (p.mesh.parent) this.gameRoot.remove(p.mesh); }
    for (const d of this.debris) { if (d.group.parent) this.gameRoot.remove(d.group); }
    for (const t of this.engineTrail) { if (t.mesh.parent) this.gameRoot.remove(t.mesh); }
    for (const a of this.asteroids) { if (a.group.parent) this.gameRoot.remove(a.group); }
    for (const d of this.player.drones) { if (d.group.parent) this.gameRoot.remove(d.group); }
    for (const sp of this.scorePopups) { if (sp.mesh.parent) this.gameRoot.remove(sp.mesh); }
    this.enemies = [];
    this.bullets = [];
    this.powerUps = [];
    this.particles = [];
    this.debris = [];
    this.engineTrail = [];
    this.asteroids = [];
    this.player.drones = [];
    this.scorePopups = [];
    this.slowMotion = false;
    this.slowMotionFactor = 1;
    this.slowMotionTimer = 0;
    this.boss = { active: false, phase: 0, hp: 0, maxHp: 0, timer: 0, patternTimer: 0, enemy: null };
    this.spawnTimer = 0;
    this.asteroidTimer = 0;
    this.miniBossWave = false;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  // ─── Enemy Spawning ─────────────────────────────────────────────
  spawnWave() {
    const diff = DIFFICULTY_MULT[this.difficulty];
    const halfH = FIELD_H / 2 - 0.5;
    const rightEdge = FIELD_W / 2 + 1;

    // check if boss time
    if (this.stageKills >= this.stageKillTarget && !this.boss.active) {
      this.spawnBoss();
      return;
    }

    const wave = Math.random();
    if (wave < 0.25) {
      // straight line
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const y = -halfH + (halfH * 2 * i) / (count - 1 || 1);
        this.createEnemy('straight', rightEdge + i * 0.5, y);
      }
    } else if (wave < 0.4) {
      // sine wave
      const y = (Math.random() - 0.5) * halfH;
      this.createEnemy('sine', rightEdge, y);
    } else if (wave < 0.55) {
      // divers
      for (let i = 0; i < 2; i++) {
        this.createEnemy('dive', rightEdge + i * 1.5, halfH * (Math.random() > 0.5 ? 1 : -1));
      }
    } else if (wave < 0.65) {
      // circle
      this.createEnemy('circle', rightEdge, (Math.random() - 0.5) * halfH);
    } else if (wave < 0.8) {
      // formation - V shape
      for (let i = 0; i < 5; i++) {
        const fx = rightEdge + Math.abs(i - 2) * 0.6;
        const fy = (i - 2) * 0.8;
        this.createEnemy('formation', fx, fy);
      }
    } else if (wave < 0.9) {
      // turret
      this.createEnemy('turret', rightEdge, (Math.random() - 0.5) * halfH * 1.5);
    } else if (wave < 0.95) {
      // sniper — stays at range
      this.createEnemy('sniper', rightEdge + 1, (Math.random() - 0.5) * halfH);
    } else if (wave < 0.97) {
      // carrier — heavy enemy that spawns swarm on death
      this.createEnemy('carrier', rightEdge, (Math.random() - 0.5) * halfH);
    } else {
      // swarm — 6-8 tiny enemies in a cluster
      const cy = (Math.random() - 0.5) * halfH;
      const count = 6 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        this.createEnemy('swarm', rightEdge + i * 0.3 + Math.random() * 0.2, cy + (Math.random() - 0.5) * 1.5);
      }
    }
  }

  spawnBoss() {
    this.audio.bossWarning();
    this.showToast('WARNING: BOSS APPROACHING');
    const enemy = this.createEnemy('boss', FIELD_W / 2 + 2, 0);
    this.boss = {
      active: true, phase: 0,
      hp: enemy.hp, maxHp: enemy.maxHp,
      timer: 0, patternTimer: 0,
      enemy,
    };
  }

  // ─── Boss Update ───────────────────────────────────────────────
  updateBoss(delta: number) {
    if (!this.boss.active || !this.boss.enemy || !this.boss.enemy.active) return;
    const b = this.boss;
    const e = b.enemy;
    if (!e) return;
    b.timer += delta;
    b.patternTimer += delta;

    // move boss to position
    const targetX = FIELD_W / 2 - 2;
    if (e.x > targetX) {
      e.x += (-SCROLL_SPEED * 0.5) * delta;
    } else {
      e.vx = 0;
      // oscillate
      e.y = Math.sin(b.timer * 0.8) * (FIELD_H / 2 - 1);
    }

    // attack patterns based on phase
    if (b.patternTimer > 1.5) {
      b.patternTimer = 0;
      const phase = b.phase;
      if (phase === 0) {
        // spread fire
        for (let i = -2; i <= 2; i++) {
          const angle = Math.PI + i * 0.3;
          this.createBullet(e.x - 0.6, e.y, Math.cos(angle) * ENEMY_BULLET_SPEED, Math.sin(angle) * ENEMY_BULLET_SPEED, false);
        }
      } else if (phase === 1) {
        // aimed fire
        const dx = this.player.x - e.x;
        const dy = this.player.y - e.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        for (let i = 0; i < 3; i++) {
          this.createBullet(e.x - 0.6, e.y + (i - 1) * 0.3, (dx / len) * ENEMY_BULLET_SPEED, (dy / len) * ENEMY_BULLET_SPEED, false);
        }
      } else {
        // phase 2: spiral
        for (let i = 0; i < 6; i++) {
          const angle = b.timer * 2 + (Math.PI * 2 * i) / 6;
          this.createBullet(e.x, e.y, Math.cos(angle) * ENEMY_BULLET_SPEED * 0.8, Math.sin(angle) * ENEMY_BULLET_SPEED * 0.8, false);
        }
        // phase 3 (hp < 20%): additional ring burst
        if (b.phase >= 3) {
          for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12 + b.timer * 0.5;
            this.createBullet(e.x, e.y, Math.cos(angle) * ENEMY_BULLET_SPEED * 0.5, Math.sin(angle) * ENEMY_BULLET_SPEED * 0.5, false);
          }
        }
      }
    }

    // sync hp
    b.hp = e.hp;
    if (e.hp <= 0) {
      this.defeatBoss();
    } else {
      // phase transitions
      const hpPct = e.hp / b.maxHp;
      if (hpPct < 0.2) { if (b.phase < 3) { b.phase = 3; this.showToast('BOSS ENRAGED!'); this.triggerShake(1.5); } }
      else if (hpPct < 0.33) b.phase = 2;
      else if (hpPct < 0.66) b.phase = 1;
    }
  }

  defeatBoss() {
    this.boss.active = false;
    this.save.totalBossKills++;
    this.score += 5000;
    this.showToast('BOSS DEFEATED! +5000');
    this.audio.explosion();
    this.triggerShake(2.5);
    if (this.boss.enemy) {
      this.spawnParticles(this.boss.enemy.x, this.boss.enemy.y, 0xff4444, 20);
      // Massive multi-burst explosion
      for (let i = 0; i < 4; i++) {
        const ox = (Math.random() - 0.5) * 1.5;
        const oy = (Math.random() - 0.5) * 1.0;
        this.spawnParticles(this.boss.enemy.x + ox, this.boss.enemy.y + oy, 0xff8800, 8);
      }
    }
    this.advanceStage();
  }

  advanceStage() {
    this.stage++;
    this.stageKills = 0;
    this.stageKillTarget = 15 + this.stage * 5;
    if (this.stage > this.save.maxStage) this.save.maxStage = this.stage;
    this.showToast('STAGE ' + this.stage);
    this.stageTransitionTimer = 1.5;
    this.triggerShake(0.5);

    // Stage-based theme cycling for visual variety
    if (this.stage % 3 === 0 && this.scene.fog) {
      const themes = THEMES;
      const themeIdx = (this.save.selectedTheme + Math.floor(this.stage / 3)) % themes.length;
      const newTheme = themes[themeIdx];
      this.scene.fog = new FogExp2(new Color(newTheme.fog).getHex(), 0.04);
      this.scene.background = new Color(newTheme.bg);
    }

    writeSave(this.save);
  }

  // ─── Collision Detection ───────────────────────────────────────
  checkCollisions() {
    const pSize = 0.25;

    // player bullets vs enemies
    for (const b of this.bullets) {
      if (!b.active || !b.isPlayer) continue;
      for (const e of this.enemies) {
        if (!e.active) continue;
        const eSize = e.type === 'boss' ? 0.6 : 0.2;
        if (Math.abs(b.x - e.x) < eSize + 0.1 && Math.abs(b.y - e.y) < eSize + 0.05) {
          b.active = true; // will be cleaned
          b.mesh.visible = false;
          b.active = false;
          e.hp -= b.damage;
          this.audio.hit();
          this.spawnParticles(b.x, b.y, new Color(this.getTheme().enemy).getHex(), 3);

          if (e.hp <= 0) {
            e.active = false;
            e.group.visible = false;
            this.score += e.points * (1 + Math.floor(this.combo / 5)) * this.feverMult;
            const earnedPts = e.points * (1 + Math.floor(this.combo / 5)) * this.feverMult;
            this.spawnScorePopup(e.x, e.y, earnedPts);
            this.combo++;
            this.comboTimer = 2;
            this.stageKills++;
            this.save.totalKills++;
            this.shotsHit++;
            this.audio.explosion();
            this.triggerShake(e.type === 'tank' ? 0.8 : (e.type === 'carrier' ? 1.0 : 0.3));
            this.spawnParticles(e.x, e.y, new Color(this.getTheme().enemy).getHex(), 10);

            // Carrier: spawn swarm on death
            if (e.type === 'carrier') {
              this.save.totalCarrierKills++;
              const spawnCount = 3 + Math.floor(Math.random() * 2);
              this.showToast('CARRIER DESTROYED!');
              for (let ci = 0; ci < spawnCount; ci++) {
                const sx = e.x + (Math.random() - 0.5) * 0.8;
                const sy = e.y + (Math.random() - 0.5) * 1.0;
                this.createEnemy('swarm', sx, sy);
              }
            }

            // power-up drop chance
            if (Math.random() < (e.type === 'carrier' ? 0.5 : 0.2)) {
              this.spawnPowerUp(e.x, e.y);
            }

            // xp
            const leveled = addXp(this.save, e.points / 10);
            if (leveled) this.showToast('LEVEL UP! Lv.' + this.save.level);
          }
        }
      }
    }

    // enemy bullets vs player
    if (!this.player.invincible) {
      for (const b of this.bullets) {
        if (!b.active || b.isPlayer) continue;
        if (Math.abs(b.x - this.player.x) < pSize && Math.abs(b.y - this.player.y) < pSize) {
          b.active = false;
          b.mesh.visible = false;
          if (this.player.shielded) {
            this.player.shielded = false;
            this.player.shieldTimer = 0;
            this.showToast('SHIELD BROKEN');
          } else {
            this.hitPlayer();
          }
        }
      }
    }

    // enemies vs player (collision)
    if (!this.player.invincible) {
      for (const e of this.enemies) {
        if (!e.active) continue;
        const eSize = e.type === 'boss' ? 0.6 : 0.2;
        if (Math.abs(e.x - this.player.x) < eSize + pSize && Math.abs(e.y - this.player.y) < eSize + pSize * 0.5) {
          if (this.player.shielded) {
            this.player.shielded = false;
            this.player.shieldTimer = 0;
            e.hp -= 3;
            if (e.hp <= 0) { e.active = false; e.group.visible = false; }
          } else {
            this.hitPlayer();
          }
        }
      }
    }

    // player vs power-ups
    for (const pu of this.powerUps) {
      if (!pu.active) continue;
      if (Math.abs(pu.x - this.player.x) < 0.4 && Math.abs(pu.y - this.player.y) < 0.4) {
        pu.active = false;
        pu.group.visible = false;
        this.collectPowerUp(pu.type);
        this.save.totalPowerUps++;
      }
    }
  }

  hitPlayer() {
    this.player.lives--;
    this.save.totalDeaths++;
    this.combo = 0;
    this.player.grazeCount = 0; // reset graze streak on death
    this.audio.death();
    this.triggerShake(1.5);
    this.spawnParticles(this.player.x, this.player.y, new Color(this.getSkin().color).getHex(), 12);

    if (this.player.lives <= 0) {
      this.endGame();
    } else {
      this.player.invincible = true;
      this.player.invincTimer = 2;
      this.showToast('SHIP DESTROYED - ' + this.player.lives + ' LEFT');
    }
  }

  collectPowerUp(type: PowerUpType) {
    this.audio.powerup();
    switch (type) {
      case 'spread':
        if (this.player.weapon === 'spread') {
          this.player.weaponLevel = Math.min(3, this.player.weaponLevel + 1);
          this.showToast('SPREAD Lv.' + this.player.weaponLevel);
        } else {
          this.player.weapon = 'spread';
          this.player.weaponLevel = 1;
          this.showToast('SPREAD SHOT');
        }
        this.player.weaponTimer = 10;
        break;
      case 'laser':
        if (this.player.weapon === 'laser') {
          this.player.weaponLevel = Math.min(3, this.player.weaponLevel + 1);
          this.showToast('LASER Lv.' + this.player.weaponLevel);
        } else {
          this.player.weapon = 'laser';
          this.player.weaponLevel = 1;
          this.showToast('LASER BEAM');
        }
        this.player.weaponTimer = 8;
        break;
      case 'missile':
        if (this.player.weapon === 'missile') {
          this.player.weaponLevel = Math.min(3, this.player.weaponLevel + 1);
          this.showToast('MISSILE Lv.' + this.player.weaponLevel);
        } else {
          this.player.weapon = 'missile';
          this.player.weaponLevel = 1;
          this.showToast('HOMING MISSILES');
        }
        this.player.weaponTimer = 12;
        break;
      case 'shield':
        if (this.player.shielded) {
          // shield already active → grant drone instead
          this.addDrone();
        } else {
          this.player.shielded = true;
          this.player.shieldTimer = 15;
          this.showToast('SHIELD ACTIVE');
        }
        break;
      case 'speed':
        this.player.speedBoost = true;
        this.player.speedTimer = 8;
        this.player.speed = PLAYER_SPEED * 1.5;
        this.showToast('SPEED BOOST');
        break;
      case 'magnet':
        this.player.magnetActive = true;
        this.player.magnetTimer = 12;
        this.save.totalMagnets++;
        this.audio.magnetPickup();
        this.showToast('MAGNET ACTIVE');
        break;
      case 'bomb':
        this.player.bombs = Math.min(this.player.bombs + 1, 5);
        this.showToast('BOMB +1 (' + this.player.bombs + ')');
        break;
    }
  }

  // ─── Shooting ──────────────────────────────────────────────────
  playerShoot() {
    this.save.totalShots++;
    this.audio.shoot();
    const px = this.player.x + 0.3;
    const py = this.player.y;
    const lvl = this.player.weaponLevel;

    switch (this.player.weapon) {
      case 'normal':
        this.createBullet(px, py, BULLET_SPEED, 0, true);
        break;
      case 'spread':
        this.createBullet(px, py, BULLET_SPEED, 0, true);
        this.createBullet(px, py, BULLET_SPEED * 0.95, BULLET_SPEED * 0.15, true);
        this.createBullet(px, py, BULLET_SPEED * 0.95, -BULLET_SPEED * 0.15, true);
        if (lvl >= 2) {
          this.createBullet(px, py, BULLET_SPEED * 0.88, BULLET_SPEED * 0.3, true);
          this.createBullet(px, py, BULLET_SPEED * 0.88, -BULLET_SPEED * 0.3, true);
        }
        if (lvl >= 3) {
          this.createBullet(px - 0.2, py, -BULLET_SPEED * 0.5, 0, true); // rear shot
        }
        break;
      case 'laser':
        this.createBullet(px, py, BULLET_SPEED * 1.5, 0, true, 3 + lvl);
        if (lvl >= 2) {
          this.createBullet(px, py + 0.15, BULLET_SPEED * 1.5, 0, true, 2);
          this.createBullet(px, py - 0.15, BULLET_SPEED * 1.5, 0, true, 2);
        }
        if (lvl >= 3) {
          this.createBullet(px, py, BULLET_SPEED * 1.8, 0, true, 5); // piercing mega beam
        }
        break;
      case 'missile': {
        const missileCount = lvl >= 3 ? 3 : (lvl >= 2 ? 2 : 1);
        for (let mi = 0; mi < missileCount; mi++) {
          let nearest: Enemy | null = null;
          let minDist = Infinity;
          const usedTargets: Set<Enemy> = new Set();
          for (const e of this.enemies) {
            if (!e.active || usedTargets.has(e)) continue;
            const d = Math.abs(e.x - px) + Math.abs(e.y - py);
            if (d < minDist) { minDist = d; nearest = e; }
          }
          if (nearest) {
            usedTargets.add(nearest);
            const dx = nearest.x - px;
            const dy = nearest.y - py + (mi - 0.5) * 0.3;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            this.createBullet(px, py + (mi - 0.5) * 0.2, (dx / len) * BULLET_SPEED, (dy / len) * BULLET_SPEED, true, 2 + lvl);
          } else {
            this.createBullet(px, py + (mi - 0.5) * 0.2, BULLET_SPEED, (mi - 0.5) * 0.5, true, 2 + lvl);
          }
        }
        break;
      }
    }
  }

  // ─── Enemy Shooting ────────────────────────────────────────────
  enemyShoot(e: Enemy) {
    if (e.type === 'straight' || e.type === 'formation' || e.type === 'swarm') return; // basic/swarm enemies don't shoot
    const diff = DIFFICULTY_MULT[this.difficulty];
    const dx = this.player.x - e.x;
    const dy = this.player.y - e.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    if (e.type === 'sniper') {
      // Sniper: fast, accurate aimed shot
      this.audio.sniperShot();
      this.createBullet(e.x - 0.3, e.y, (dx / len) * ENEMY_BULLET_SPEED * 1.8, (dy / len) * ENEMY_BULLET_SPEED * 1.2, false, 2);
    } else {
      this.createBullet(e.x - 0.2, e.y, (dx / len) * ENEMY_BULLET_SPEED * diff.speed, (dy / len) * ENEMY_BULLET_SPEED * diff.speed * 0.5, false);
    }
  }

  // ─── State Transitions ──────────────────────────────────────────
  startGame(mode: GameMode = 'campaign') {
    this.mode = mode;
    this.state = 'countdown';
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.stage = 1;
    this.stageTimer = 0;
    this.stageKills = 0;
    this.stageKillTarget = 15;
    this.gameTime = 0;
    this.countdownVal = 3;
    this.countdownTimer = 0;
    this.shotsHit = 0;
    this.waveNumber = 0;
    this.feverMult = 1;
    this.player = this.defaultPlayer();
    this.clearGameEntities();
    this.createPlayerShip();
    this.save.totalGames++;

    // Mode-specific setup
    switch (mode) {
      case 'zen':
        this.player.lives = 99;
        this.player.shielded = true;
        this.player.shieldTimer = 99999;
        break;
      case 'fever':
        this.feverMult = 2;
        this.player.fireRate = FIRE_RATE * 0.6;
        break;
      case 'precision':
        this.player.lives = 1;
        this.player.fireRate = FIRE_RATE * 2;
        break;
      case 'endless':
        this.stageKillTarget = 999999;
        break;
      case 'daily':
        this.dailySeed = Math.floor(Date.now() / 86400000);
        break;
    }

    this.showAllPanels(false);
    this.showPanel('countdown', true);
    this.updateCountdownUI();
  }

  endGame() {
    this.state = 'gameover';
    this.audio.gameOver();
    this.removePlayerShip();

    // save score
    this.save.totalPlayTime += this.gameTime;
    if (this.combo > this.save.maxCombo) this.save.maxCombo = this.combo;
    this.save.highScores.push({
      name: 'Player', score: this.score,
      mode: this.mode,
      date: new Date().toISOString().split('T')[0],
    });
    this.save.highScores.sort((a, b) => b.score - a.score);
    this.save.highScores = this.save.highScores.slice(0, 10);

    const newAch = checkAchievements(this.save);
    for (const a of newAch) {
      this.audio.achievement();
      this.showToast('ACHIEVEMENT: ' + a);
    }
    // check skin unlocks
    this.checkSkinUnlocks();
    writeSave(this.save);

    this.showAllPanels(false);
    this.showPanel('gameover', true);
    this.updateGameOverUI();
  }

  checkSkinUnlocks() {
    const unlocks: [string, (s: SaveData) => boolean][] = [
      ['Solar Flare', s => s.totalKills >= 100],
      ['Plasma Pink', s => s.highScores.some(h => h.score >= 10000)],
      ['Frost Core', s => s.totalGames >= 10],
      ['Toxic Green', s => s.maxCombo >= 10],
      ['Royal Gold', s => s.totalBossKills >= 1],
      ['Void Purple', s => s.maxStage >= 5],
      ['Inferno Red', s => s.totalGames >= 8],
    ];
    for (const [name, check] of unlocks) {
      if (!this.save.unlockedSkins.includes(name) && check(this.save)) {
        this.save.unlockedSkins.push(name);
        this.showToast('SKIN UNLOCKED: ' + name);
      }
    }
  }

  setState(s: GameState) {
    this.state = s;
    this.audio.menuClick();
    this.showAllPanels(false);
    this.showPanel(s, true);

    if (s === 'title') this.updateTitleUI();
    if (s === 'modes') this.updateModesUI();
    if (s === 'leaderboard') this.updateLeaderboardUI();
    if (s === 'achievements') this.updateAchievementsUI();
    if (s === 'settings') this.updateSettingsUI();
    if (s === 'stats') this.updateStatsUI();
    if (s === 'skins') this.updateSkinsUI();
  }

  showToast(msg: string) {
    this.toastQueue.push(msg);
  }

  // ─── Main Update ──────────────────────────────────────────────
  update(delta: number) {
    // cap delta
    const rawDt = Math.min(delta, 0.05);
    // Apply slow motion
    const dt = this.updateSlowMotion(rawDt);

    // toast timer
    if (this.toastQueue.length > 0 && this.toastTimer <= 0) {
      const msg = this.toastQueue.shift()!;
      this.updateToastUI(msg);
      this.showPanel('toast', true);
      this.toastTimer = 2;
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.showPanel('toast', false);
    }

    if (this.state === 'countdown') {
      this.countdownTimer += dt;
      if (this.countdownTimer >= 1) {
        this.countdownTimer = 0;
        this.countdownVal--;
        this.audio.countdown();
        if (this.countdownVal <= 0) {
          this.state = 'playing';
          this.showAllPanels(false);
          this.showPanel('hud', true);
          this.showPanel('powerup', false);
          this.showPanel('bosshealth', false);
        } else {
          this.updateCountdownUI();
        }
      }
      return;
    }

    if (this.state !== 'playing') return;

    this.gameTime += dt;
    this.scrollOffset += SCROLL_SPEED * dt;

    // Screen shake
    this.updateShake(dt);

    // Multi-layer parallax star field
    for (const layer of this.starLayers) {
      for (const star of layer.meshes) {
        star.position.x -= SCROLL_SPEED * layer.speed * dt;
        if (star.position.x < -20) star.position.x += 40;
        // Subtle twinkle
        const mat = star.material as MeshBasicMaterial;
        mat.opacity += (Math.random() - 0.5) * 0.02;
        mat.opacity = Math.max(0.1, Math.min(0.9, mat.opacity));
      }
    }

    // Background debris
    if (Math.random() < 0.02) this.spawnDebris();
    for (const d of this.debris) {
      if (!d.active) continue;
      d.x += d.vx * dt;
      d.group.position.x = d.x;
      d.mesh.rotation.x += d.rotSpeed * dt;
      d.mesh.rotation.y += d.rotSpeed * 0.7 * dt;
      if (d.x < -FIELD_W / 2 - 5) { d.active = false; d.group.visible = false; }
    }
    this.debris = this.debris.filter(d => {
      if (!d.active) { if (d.group.parent) this.gameRoot.remove(d.group); return false; }
      return true;
    });

    // Engine trail
    if (Math.random() < 0.7) this.spawnEngineTrail();
    this.updateEngineTrail(dt);

    // update player timers
    this.player.fireTimer -= dt;
    if (this.player.weaponTimer > 0) {
      this.player.weaponTimer -= dt;
      if (this.player.weaponTimer <= 0) { this.player.weapon = 'normal'; this.player.weaponLevel = 1; }
    }
    if (this.player.shieldTimer > 0) {
      this.player.shieldTimer -= dt;
      if (this.player.shieldTimer <= 0) { this.player.shielded = false; }
    }
    if (this.player.speedTimer > 0) {
      this.player.speedTimer -= dt;
      if (this.player.speedTimer <= 0) { this.player.speedBoost = false; this.player.speed = PLAYER_SPEED; }
    }
    if (this.player.invincible) {
      this.player.invincTimer -= dt;
      if (this.player.invincTimer <= 0) this.player.invincible = false;
      // flicker
      if (this.player.group) {
        this.player.group.visible = Math.floor(this.player.invincTimer * 10) % 2 === 0;
      }
    } else if (this.player.group) {
      this.player.group.visible = true;
    }

    // combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        if (this.mode === 'fever') this.feverMult = Math.max(1, this.feverMult - 1);
      }
    }
    // Fever mode: combo increases multiplier
    if (this.mode === 'fever' && this.combo > 0 && this.combo % 10 === 0) {
      const newMult = Math.min(8, 2 + Math.floor(this.combo / 10));
      if (newMult > this.feverMult) {
        this.feverMult = newMult;
        this.showToast('FEVER x' + this.feverMult + '!');
      }
    }

    // shield visual
    if (this.player.shieldMesh) {
      const shieldMat = this.player.shieldMesh.material as MeshBasicMaterial;
      shieldMat.opacity = this.player.shielded ? 0.3 + Math.sin(this.gameTime * 5) * 0.1 : 0;
    }

    // update player position
    if (this.player.group) {
      this.player.group.position.set(this.player.x, this.player.y, 0);
    }

    // update enemies
    for (const e of this.enemies) {
      if (!e.active) continue;
      e.timer += dt;
      e.x += e.vx * dt;

      // movement patterns
      switch (e.type) {
        case 'sine':
          e.y = e.baseY + Math.sin(e.timer * 3) * 2;
          break;
        case 'dive':
          e.vy += (this.player.y > e.y ? 3 : -3) * dt;
          e.y += e.vy * dt;
          break;
        case 'circle':
          e.y = e.baseY + Math.sin(e.timer * 2) * 2;
          break;
        default:
          e.y += e.vy * dt;
      }

      // enemy shooting
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.type !== 'boss') {
        e.fireTimer = 2 + Math.random() * 2;
        this.enemyShoot(e);
      }

      // remove if off screen
      if (e.x < -FIELD_W / 2 - 2) { e.active = false; e.group.visible = false; }

      e.group.position.set(e.x, e.y, 0);
      // rotate for visual flair
      e.mesh.rotation.z += dt * (e.type === 'circle' ? 3 : 0.5);
    }

    // update bullets
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.mesh.position.set(b.x, b.y, 0);
      // off screen check
      if (b.x < -FIELD_W / 2 - 1 || b.x > FIELD_W / 2 + 1 ||
          b.y < -FIELD_H / 2 - 1 || b.y > FIELD_H / 2 + 1) {
        b.active = false;
        b.mesh.visible = false;
      }
    }

    // update power-ups
    for (const pu of this.powerUps) {
      if (!pu.active) continue;
      pu.x -= SCROLL_SPEED * 0.3 * dt;
      pu.timer += dt;
      pu.group.position.set(pu.x, pu.y, 0);
      pu.mesh.rotation.y += dt * 3;
      pu.mesh.rotation.x += dt * 2;
      if (pu.x < -FIELD_W / 2 - 1) { pu.active = false; pu.group.visible = false; }
    }

    // update particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; p.mesh.visible = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.mesh.position.set(p.x, p.y, 0);
      const alpha = p.life / p.maxLife;
      (p.mesh.material as MeshBasicMaterial).opacity = alpha;
      const s = alpha * 0.8 + 0.2;
      p.mesh.scale.set(s, s, s);
    }

    // spawn enemies
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && !this.boss.active) {
      const diff = DIFFICULTY_MULT[this.difficulty];
      // Stage-based scaling: enemies spawn faster as stages progress
      const stageScale = 1 + (this.stage - 1) * 0.08;
      this.spawnTimer = (2 + Math.random() * 2) / (diff.spawn * stageScale);
      // Fever mode: faster spawns
      if (this.mode === 'fever') this.spawnTimer *= 0.6;
      this.waveNumber++;
      if (this.waveNumber % 5 === 0) {
        this.showToast('WAVE ' + this.waveNumber);
      }
      // Mini-boss every 7 waves
      if (this.waveNumber % 7 === 0 && !this.boss.active) {
        this.spawnMiniBoss();
      } else {
        this.spawnWave();
      }
    }

    // Asteroids — spawn periodically starting stage 2
    if (this.stage >= 2) {
      this.asteroidTimer -= dt;
      if (this.asteroidTimer <= 0) {
        this.asteroidTimer = 3 + Math.random() * 4 - this.stage * 0.2;
        this.spawnAsteroid();
      }
    }
    this.updateAsteroids(dt);

    // Drones
    this.updateDrones(dt);

    // Magnet
    this.updateMagnet(dt);

    // Score popups
    this.updateScorePopups(dt);

    // Graze detection
    this.checkGrazes();

    // boss update
    this.updateBoss(dt);

    // collisions
    this.checkCollisions();

    // cleanup inactive
    this.enemies = this.enemies.filter(e => {
      if (!e.active) { if (e.group.parent) this.gameRoot.remove(e.group); return false; }
      return true;
    });
    this.bullets = this.bullets.filter(b => {
      if (!b.active) { if (b.mesh.parent) this.gameRoot.remove(b.mesh); return false; }
      return true;
    });
    this.powerUps = this.powerUps.filter(p => {
      if (!p.active) { if (p.group.parent) this.gameRoot.remove(p.group); return false; }
      return true;
    });
    this.particles = this.particles.filter(p => {
      if (!p.active) { if (p.mesh.parent) this.gameRoot.remove(p.mesh); return false; }
      return true;
    });

    // timed mode
    if (this.mode === 'timed' && this.gameTime >= 120) {
      this.endGame();
      return;
    }

    // update HUD
    this.updateHudUI();

    // boss health bar
    if (this.boss.active) {
      this.showPanel('bosshealth', true);
      this.updateBossHealthUI();
    } else {
      this.showPanel('bosshealth', false);
    }

    // power-up indicator
    if (this.player.weapon !== 'normal' || this.player.shielded || this.player.speedBoost || this.player.magnetActive) {
      this.showPanel('powerup', true);
      this.updatePowerUpUI();
    } else {
      this.showPanel('powerup', false);
    }
  }

  // ─── Panel Management ──────────────────────────────────────────
  showPanel(name: string, visible: boolean) {
    const entity = this.panelEntities.get(name);
    if (entity?.object3D) entity.object3D.visible = visible;
  }

  showAllPanels(visible: boolean) {
    for (const [, entity] of this.panelEntities) {
      if (entity.object3D) entity.object3D.visible = visible;
    }
  }

  getDoc(name: string): UIKitDocument | undefined {
    const entity = this.panelEntities.get(name);
    if (!entity) return undefined;
    return entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
  }

  setText(panelName: string, elementId: string, text: string) {
    const doc = this.getDoc(panelName);
    if (!doc) return;
    const el = doc.getElementById(elementId) as UIKit.Text | undefined;
    el?.setProperties({ text });
  }

  // ─── UI Updates ────────────────────────────────────────────────
  updateTitleUI() {
    this.setText('title', 'level-text', 'Lv.' + this.save.level);
    this.setText('title', 'xp-text', 'XP: ' + this.save.xp + '/' + (this.save.level * XP_PER_LEVEL));
    const hs = this.save.highScores[0];
    this.setText('title', 'highscore-text', hs ? 'Best: ' + hs.score.toLocaleString() : 'No scores yet');
  }

  updateModesUI() {
    // modes panel shows 8 game modes - text already in uikitml
  }

  updateCountdownUI() {
    this.setText('countdown', 'count-text', this.countdownVal > 0 ? String(this.countdownVal) : 'GO!');
  }

  updateHudUI() {
    this.setText('hud', 'score-val', String(this.score));
    this.setText('hud', 'lives-val', this.mode === 'zen' ? '∞' : String(this.player.lives));
    const stageStr = 'Stage ' + this.stage + (this.player.drones.length > 0 ? ' D:' + this.player.drones.length : '');
    this.setText('hud', 'stage-val', stageStr);
    let comboText = '';
    if (this.combo > 1) comboText += 'x' + this.combo;
    if (this.feverMult > 1) comboText += ' FEVER!';
    if (this.player.grazeCount > 0) comboText += ' G:' + this.player.grazeCount;
    if (this.slowMotion) comboText += ' SLOW';
    this.setText('hud', 'combo-val', comboText);
    if (this.mode === 'timed') {
      const rem = Math.max(0, 120 - Math.floor(this.gameTime));
      this.setText('hud', 'timer-val', String(rem) + 's');
    } else if (this.mode === 'fever') {
      this.setText('hud', 'timer-val', this.feverMult + 'x');
    } else if (this.player.weapon !== 'normal' && this.player.weaponLevel > 1) {
      this.setText('hud', 'timer-val', 'Lv.' + this.player.weaponLevel);
    } else {
      this.setText('hud', 'timer-val', '');
    }
  }

  updateGameOverUI() {
    this.setText('gameover', 'final-score', String(this.score));
    this.setText('gameover', 'final-stage', 'Stage ' + this.stage);
    this.setText('gameover', 'final-kills', String(this.stageKills));
    const accuracy = this.save.totalShots > 0 ? Math.floor((this.shotsHit / this.save.totalShots) * 100) : 0;
    const comboStr = 'Combo: x' + (this.combo > this.save.maxCombo ? this.combo : this.save.maxCombo);
    const grazeStr = this.player.grazeTotal > 0 ? ' | Graze: ' + this.player.grazeTotal : '';
    const accStr = this.mode === 'precision' ? ' | Acc: ' + accuracy + '%' : '';
    this.setText('gameover', 'final-combo', comboStr + grazeStr + accStr);
    const hs = this.save.highScores[0];
    this.setText('gameover', 'best-score', hs ? 'High Score: ' + hs.score.toLocaleString() : '');
  }

  updateLeaderboardUI() {
    for (let i = 0; i < 10; i++) {
      const entry = this.save.highScores[i];
      this.setText('leaderboard', 'lb-' + (i + 1), entry
        ? '#' + (i + 1) + ' ' + entry.score.toLocaleString() + ' (' + entry.mode + ')'
        : '#' + (i + 1) + ' ---');
    }
  }

  updateAchievementsUI() {
    const unlocked = this.save.achievements.length;
    const total = ACHIEVEMENTS.length;
    this.setText('achievements', 'ach-progress', unlocked + '/' + total + ' Unlocked');
    // Show a curated selection including new achievement types
    const displayed = [
      ACHIEVEMENTS[0],  // First Blood
      ACHIEVEMENTS[1],  // Ace Pilot
      ACHIEVEMENTS[2],  // Squadron Leader
      ACHIEVEMENTS[3],  // Fleet Commander
      ACHIEVEMENTS[4],  // Rising Star
      ACHIEVEMENTS[9],  // Combo Starter
      ACHIEVEMENTS[13], // Boss Slayer
      ACHIEVEMENTS[16], // Regular
      ACHIEVEMENTS[19], // Sector 3
      ACHIEVEMENTS[42], // Daredevil (graze)
      ACHIEVEMENTS[47], // Elite Hunter (mini-boss)
      ACHIEVEMENTS[49], // Rock Breaker (asteroids)
      ACHIEVEMENTS[51], // Charge Master
      ACHIEVEMENTS[50], // Drone Commander
    ];
    for (let i = 0; i < Math.min(14, displayed.length); i++) {
      const a = displayed[i];
      if (!a) continue;
      const done = this.save.achievements.includes(a.id);
      this.setText('achievements', 'ach-' + i, (done ? '[*] ' : '[ ] ') + a.name);
      this.setText('achievements', 'ach-desc-' + i, a.desc);
    }
  }

  updateSettingsUI() {
    this.setText('settings', 'sfx-val', this.save.settings.sfx ? 'ON' : 'OFF');
    this.setText('settings', 'music-val', this.save.settings.music ? 'ON' : 'OFF');
    this.setText('settings', 'particles-val', this.save.settings.particles ? 'ON' : 'OFF');
    this.setText('settings', 'shake-val', this.save.settings.screenShake ? 'ON' : 'OFF');
    this.setText('settings', 'theme-val', this.getTheme().name);
  }

  updateStatsUI() {
    this.setText('stats', 'stat-games', 'Games: ' + this.save.totalGames);
    this.setText('stats', 'stat-kills', 'Kills: ' + this.save.totalKills);
    this.setText('stats', 'stat-shots', 'Shots: ' + this.save.totalShots);
    this.setText('stats', 'stat-deaths', 'Deaths: ' + this.save.totalDeaths);
    this.setText('stats', 'stat-bosses', 'Bosses: ' + this.save.totalBossKills);
    this.setText('stats', 'stat-combo', 'Max Combo: x' + this.save.maxCombo);
    this.setText('stats', 'stat-stage', 'Max Stage: ' + this.save.maxStage);
    this.setText('stats', 'stat-level', 'Level: ' + this.save.level);
    this.setText('stats', 'stat-time', 'Play Time: ' + Math.floor(this.save.totalPlayTime / 60) + 'm');
    this.setText('stats', 'stat-powerups', 'Power-ups: ' + this.save.totalPowerUps);
    this.setText('stats', 'stat-grazes', 'Grazes: ' + this.save.totalGrazes);
    this.setText('stats', 'stat-charges', 'Charge Shots: ' + this.save.totalChargeShots);
    this.setText('stats', 'stat-bombs', 'Bombs: ' + this.save.totalBombs);
  }

  updateSkinsUI() {
    for (let i = 0; i < SKINS.length; i++) {
      const skin = SKINS[i];
      const unlocked = this.save.unlockedSkins.includes(skin.name);
      const selected = i === this.save.selectedSkin;
      this.setText('skins', 'btn-skin-' + i,
        (selected ? '> ' : '  ') + skin.name + (unlocked ? '' : ' [' + skin.unlock + ']'));
    }
  }

  updateToastUI(msg: string) {
    this.setText('toast', 'toast-msg', msg);
  }

  updateBossHealthUI() {
    if (!this.boss.active) return;
    const pct = Math.max(0, Math.floor((this.boss.hp / this.boss.maxHp) * 100));
    this.setText('bosshealth', 'boss-name', 'BOSS - Stage ' + this.stage);
    this.setText('bosshealth', 'boss-hp', pct + '%');
  }

  updatePowerUpUI() {
    let text = '';
    if (this.player.weapon !== 'normal') {
      text += this.player.weapon.toUpperCase() + ' ' + Math.ceil(this.player.weaponTimer) + 's';
    }
    if (this.player.shielded) text += (text ? ' | ' : '') + 'SHIELD ' + Math.ceil(this.player.shieldTimer) + 's';
    if (this.player.speedBoost) text += (text ? ' | ' : '') + 'SPEED ' + Math.ceil(this.player.speedTimer) + 's';
    if (this.player.magnetActive) text += (text ? ' | ' : '') + 'MAGNET ' + Math.ceil(this.player.magnetTimer) + 's';
    this.setText('powerup', 'powerup-text', text);
  }

  updateDifficultyUI() {
    this.setText('difficulty', 'diff-label', this.difficulty.toUpperCase());
  }
}

// ─── UI System ──────────────────────────────────────────────────────
class NeonRushUISystem extends createSystem({
  title: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/title.json')] },
  modes: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/modes.json')] },
  difficulty: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/difficulty.json')] },
  hud: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/hud.json')] },
  pause: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/pause.json')] },
  gameover: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/gameover.json')] },
  leaderboard: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/leaderboard.json')] },
  achievements: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/achievements.json')] },
  settings: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/settings.json')] },
  stats: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/stats.json')] },
  skins: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/skins.json')] },
  help: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/help.json')] },
  toast: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/toast.json')] },
  countdown: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/countdown.json')] },
  powerup: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/powerup.json')] },
  bosshealth: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/bosshealth.json')] },
}) {
  private game!: GameManager;

  setGame(g: GameManager) { this.game = g; }

  init() {
    const bindPanel = (name: string, query: { subscribe: (ev: 'qualify' | 'disqualify', cb: (e: Entity) => void) => void }) => {
      query.subscribe('qualify', (entity: Entity) => {
        this.game.panelEntities.set(name, entity);
        if (entity.object3D) entity.object3D.visible = name === 'title';
        this.wirePanel(name, entity);
      });
    };

    bindPanel('title', this.queries.title);
    bindPanel('modes', this.queries.modes);
    bindPanel('difficulty', this.queries.difficulty);
    bindPanel('hud', this.queries.hud);
    bindPanel('pause', this.queries.pause);
    bindPanel('gameover', this.queries.gameover);
    bindPanel('leaderboard', this.queries.leaderboard);
    bindPanel('achievements', this.queries.achievements);
    bindPanel('settings', this.queries.settings);
    bindPanel('stats', this.queries.stats);
    bindPanel('skins', this.queries.skins);
    bindPanel('help', this.queries.help);
    bindPanel('toast', this.queries.toast);
    bindPanel('countdown', this.queries.countdown);
    bindPanel('powerup', this.queries.powerup);
    bindPanel('bosshealth', this.queries.bosshealth);
  }

  wirePanel(name: string, entity: Entity) {
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (!doc) return;

    const btn = (id: string, cb: () => void) => {
      const el = doc.getElementById(id);
      (el as unknown as { addEventListener?: (ev: string, cb: () => void) => void })?.addEventListener?.('click', cb);
    };

    switch (name) {
      case 'title':
        this.game.updateTitleUI();
        btn('btn-play', () => this.game.setState('modes'));
        btn('btn-leaderboard', () => this.game.setState('leaderboard'));
        btn('btn-achievements', () => this.game.setState('achievements'));
        btn('btn-settings', () => this.game.setState('settings'));
        btn('btn-stats', () => this.game.setState('stats'));
        btn('btn-skins', () => this.game.setState('skins'));
        btn('btn-help', () => this.game.setState('help'));
        break;

      case 'modes':
        for (const mode of MODES) {
          btn('btn-' + mode, () => {
            this.game.setState('difficulty');
            this.game.mode = mode;
            this.game.updateDifficultyUI();
          });
        }
        btn('btn-modes-back', () => this.game.setState('title'));
        break;

      case 'difficulty':
        this.game.updateDifficultyUI();
        btn('btn-easy', () => { this.game.difficulty = 'easy'; this.game.startGame(this.game.mode); });
        btn('btn-normal', () => { this.game.difficulty = 'normal'; this.game.startGame(this.game.mode); });
        btn('btn-hard', () => { this.game.difficulty = 'hard'; this.game.startGame(this.game.mode); });
        btn('btn-insane', () => { this.game.difficulty = 'insane'; this.game.startGame(this.game.mode); });
        btn('btn-diff-back', () => this.game.setState('modes'));
        break;

      case 'pause':
        btn('btn-resume', () => { this.game.state = 'playing'; this.game.showAllPanels(false); this.game.showPanel('hud', true); });
        btn('btn-quit', () => { this.game.clearGameEntities(); this.game.removePlayerShip(); this.game.setState('title'); });
        break;

      case 'gameover':
        btn('btn-retry', () => this.game.startGame(this.game.mode));
        btn('btn-go-title', () => { this.game.clearGameEntities(); this.game.setState('title'); });
        break;

      case 'leaderboard':
        this.game.updateLeaderboardUI();
        btn('btn-lb-back', () => this.game.setState('title'));
        break;

      case 'achievements':
        this.game.updateAchievementsUI();
        btn('btn-ach-back', () => this.game.setState('title'));
        break;

      case 'settings':
        this.game.updateSettingsUI();
        btn('btn-sfx', () => {
          this.game.save.settings.sfx = !this.game.save.settings.sfx;
          this.game.audio.setEnabled(this.game.save.settings.sfx);
          this.game.updateSettingsUI();
          writeSave(this.game.save);
        });
        btn('btn-music', () => {
          this.game.save.settings.music = !this.game.save.settings.music;
          this.game.updateSettingsUI();
          writeSave(this.game.save);
        });
        btn('btn-particles', () => {
          this.game.save.settings.particles = !this.game.save.settings.particles;
          this.game.updateSettingsUI();
          writeSave(this.game.save);
        });
        btn('btn-shake', () => {
          this.game.save.settings.screenShake = !this.game.save.settings.screenShake;
          this.game.updateSettingsUI();
          writeSave(this.game.save);
        });
        btn('btn-theme', () => {
          this.game.save.selectedTheme = (this.game.save.selectedTheme + 1) % THEMES.length;
          this.game.updateSettingsUI();
          writeSave(this.game.save);
        });
        btn('btn-reset', () => {
          localStorage.removeItem(SAVE_KEY);
          this.game.save = defaultSave();
          this.game.updateSettingsUI();
        });
        btn('btn-settings-back', () => this.game.setState('title'));
        break;

      case 'stats':
        this.game.updateStatsUI();
        btn('btn-stats-back', () => this.game.setState('title'));
        break;

      case 'skins':
        this.game.updateSkinsUI();
        for (let i = 0; i < SKINS.length; i++) {
          btn('btn-skin-' + i, () => {
            if (this.game.save.unlockedSkins.includes(SKINS[i].name)) {
              this.game.save.selectedSkin = i;
              this.game.updateSkinsUI();
              writeSave(this.game.save);
            }
          });
        }
        btn('btn-skins-back', () => this.game.setState('title'));
        break;

      case 'help':
        btn('btn-help-back', () => this.game.setState('title'));
        break;
    }
  }
}

// ─── Game Loop System ───────────────────────────────────────────────
class NeonRushGameSystem extends createSystem({}) {
  private game!: GameManager;

  setGame(g: GameManager) { this.game = g; }

  update(delta: number, _time: number) {
    if (!this.game) return;
    this.handleInput(delta);
    this.game.update(delta);
  }

  handleInput(delta: number) {
    if (this.game.state !== 'playing' && this.game.state !== 'paused') {
      // menu navigation via keyboard
      return;
    }

    const kb = this.input.keyboard;

    // Pause toggle
    if (kb.getKeyDown('Escape') || kb.getKeyDown('KeyP')) {
      if (this.game.state === 'playing') {
        this.game.state = 'paused';
        this.game.showAllPanels(false);
        this.game.showPanel('pause', true);
        return;
      } else if (this.game.state === 'paused') {
        this.game.state = 'playing';
        this.game.showAllPanels(false);
        this.game.showPanel('hud', true);
        return;
      }
    }

    if (this.game.state !== 'playing') return;

    const speed = this.game.player.speed * delta;

    // Movement - WASD / Arrow keys
    if (kb.getKeyPressed('ArrowUp') || kb.getKeyPressed('KeyW')) {
      this.game.player.y = Math.min(FIELD_H / 2 - 0.3, this.game.player.y + speed);
    }
    if (kb.getKeyPressed('ArrowDown') || kb.getKeyPressed('KeyS')) {
      this.game.player.y = Math.max(-FIELD_H / 2 + 0.3, this.game.player.y - speed);
    }
    if (kb.getKeyPressed('ArrowLeft') || kb.getKeyPressed('KeyA')) {
      this.game.player.x = Math.max(-FIELD_W / 2 + 0.3, this.game.player.x - speed);
    }
    if (kb.getKeyPressed('ArrowRight') || kb.getKeyPressed('KeyD')) {
      this.game.player.x = Math.min(FIELD_W / 2 - 2, this.game.player.x + speed);
    }

    // Shooting - Space / Z
    if (kb.getKeyPressed('Space') || kb.getKeyPressed('KeyZ')) {
      if (this.game.player.fireTimer <= 0) {
        this.game.player.fireTimer = this.game.player.fireRate;
        this.game.playerShoot();
      }
    }

    // Charge shot - hold X / C
    const chargeHeld = kb.getKeyPressed('KeyX') || kb.getKeyPressed('KeyC');
    this.game.updateCharge(delta, chargeHeld);

    // Bomb - B key
    if (kb.getKeyDown('KeyB')) {
      this.game.deployBomb();
    }
    this.game.updateCharge(delta, chargeHeld);

    // XR input
    const right = this.input.xr?.gamepads?.right;
    const left = this.input.xr?.gamepads?.left;
    if (right) {
      const stick = right.getAxesValues(InputComponent.Thumbstick);
      if (stick) {
        this.game.player.x = Math.max(-FIELD_W / 2 + 0.3, Math.min(FIELD_W / 2 - 2, this.game.player.x + stick.x * speed));
        this.game.player.y = Math.max(-FIELD_H / 2 + 0.3, Math.min(FIELD_H / 2 - 0.3, this.game.player.y + stick.y * speed));
      }
      if (right.getButtonPressed(InputComponent.Trigger)) {
        if (this.game.player.fireTimer <= 0) {
          this.game.player.fireTimer = this.game.player.fireRate;
          this.game.playerShoot();
        }
      }
      // A button for charge shot in XR
      const aPressed = right.getButtonPressed(InputComponent.A_Button);
      this.game.updateCharge(delta, aPressed);
      if (right.getButtonDown(InputComponent.B_Button)) {
        if (this.game.state === 'playing') {
          this.game.state = 'paused';
          this.game.showAllPanels(false);
          this.game.showPanel('pause', true);
        }
      }
      // Y button for bomb in XR
      if (left) {
        if (left.getButtonDown(InputComponent.Y_Button)) {
          this.game.deployBomb();
        }
      }
    }
    // Left controller: movement via left stick
    if (left) {
      const leftStick = left.getAxesValues(InputComponent.Thumbstick);
      if (leftStick) {
        this.game.player.x = Math.max(-FIELD_W / 2 + 0.3, Math.min(FIELD_W / 2 - 2, this.game.player.x + leftStick.x * speed));
        this.game.player.y = Math.max(-FIELD_H / 2 + 0.3, Math.min(FIELD_H / 2 - 0.3, this.game.player.y + leftStick.y * speed));
      }
      // Left trigger also shoots
      if (left.getButtonPressed(InputComponent.Trigger)) {
        if (this.game.player.fireTimer <= 0) {
          this.game.player.fireTimer = this.game.player.fireRate;
          this.game.playerShoot();
        }
      }
    }
  }
}

// ─── Boot ───────────────────────────────────────────────────────────
async function main() {
  const container = document.getElementById('app') as HTMLDivElement;
  const world = await World.create(container, {
    xr: { offer: 'once' as const },
    render: {
      defaultLighting: false,
      near: 0.01,
      far: 100,
      camera: { position: [0, 1.6, 0], lookAt: [0, 1.35, -1.5] },
    },
    input: { canvasPointerEvents: true },
    features: {
      grabbing: false,
      locomotion: false,
      physics: false,
    },
  });

  const game = new GameManager();
  game.world = world;
  game.audio.init();
  game.setupScene();

  // create panel entities
  const panelConfigs = [
    'title', 'modes', 'difficulty', 'hud', 'pause', 'gameover',
    'leaderboard', 'achievements', 'settings', 'stats', 'skins',
    'help', 'toast', 'countdown', 'powerup', 'bosshealth',
  ];

  const panelSetup: Record<string, { pos: [number, number, number]; mw: number; mh: number; vis: boolean }> = {
    title:        { pos: [0, 1.35, -1.15], mw: 500, mh: 600, vis: true },
    modes:        { pos: [0, 1.35, -1.15], mw: 500, mh: 620, vis: false },
    difficulty:   { pos: [0, 1.35, -1.15], mw: 450, mh: 500, vis: false },
    hud:          { pos: [0, 2.0, -1.5],   mw: 600, mh: 60,  vis: false },
    pause:        { pos: [0, 1.35, -1.15], mw: 450, mh: 350, vis: false },
    gameover:     { pos: [0, 1.35, -1.15], mw: 500, mh: 500, vis: false },
    leaderboard:  { pos: [0, 1.35, -1.15], mw: 500, mh: 600, vis: false },
    achievements: { pos: [0, 1.35, -1.15], mw: 500, mh: 700, vis: false },
    settings:     { pos: [0, 1.35, -1.15], mw: 500, mh: 550, vis: false },
    stats:        { pos: [0, 1.35, -1.15], mw: 500, mh: 500, vis: false },
    skins:        { pos: [0, 1.35, -1.15], mw: 500, mh: 500, vis: false },
    help:         { pos: [0, 1.35, -1.15], mw: 500, mh: 600, vis: false },
    toast:        { pos: [0, 2.1, -1.5],   mw: 400, mh: 60,  vis: false },
    countdown:    { pos: [0, 1.4, -1.5],   mw: 300, mh: 200, vis: false },
    powerup:      { pos: [0, 1.85, -1.5],  mw: 400, mh: 50,  vis: false },
    bosshealth:   { pos: [0, 2.2, -1.5],   mw: 400, mh: 50,  vis: false },
  };

  for (const name of panelConfigs) {
    const cfg = panelSetup[name] || { pos: [0, 1.35, -1.15], mw: 500, mh: 500, vis: false };
    const entity = world.createTransformEntity();
    entity.object3D!.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    entity.addComponent(PanelUI, { config: './ui/' + name + '.json', maxWidth: cfg.mw, maxHeight: cfg.mh });
    entity.object3D!.visible = cfg.vis;
  }

  // register systems
  world.registerSystem(NeonRushUISystem);
  world.registerSystem(NeonRushGameSystem);

  const uiSys = world.getSystem(NeonRushUISystem)!;
  uiSys.setGame(game);

  const gameSys = world.getSystem(NeonRushGameSystem)!;
  gameSys.setGame(game);
}

main().catch(console.error);
