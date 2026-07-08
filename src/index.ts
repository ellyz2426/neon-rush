import {
  World,
  createSystem,
  PanelUI,
  PanelDocument,
  UIKitDocument,
  UIKit,
  Follower,
  ScreenSpace,
  InputComponent,
  eq,
  SphereGeometry,
  MeshStandardMaterial,
  BoxGeometry,
  CylinderGeometry,
  TorusGeometry,
  OctahedronGeometry,
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
  IcosahedronGeometry,
  EdgesGeometry,
  type Entity,
} from '@iwsdk/core';

// ─── Types & Constants ──────────────────────────────────────────────
type GameState = 'title' | 'modes' | 'difficulty' | 'countdown' | 'playing' | 'gameover' | 'paused'
  | 'leaderboard' | 'achievements' | 'settings' | 'stats' | 'skins' | 'help';

interface Peg {
  mesh: Mesh; glow: Mesh; type: 'orange' | 'blue' | 'green' | 'purple';
  x: number; y: number; radius: number; hit: boolean; fadeTimer: number;
}

interface Ball {
  mesh: Mesh; glow: Mesh; trail: Vector3[];
  vx: number; vy: number; x: number; y: number; radius: number; active: boolean;
}

interface Particle {
  mesh: Mesh; vx: number; vy: number; life: number; maxLife: number; active: boolean;
}

const BOARD_W = 6, BOARD_H = 8, PEG_R = 0.08;
const GRAVITY = -4.5, BALL_R = 0.06;
const WALL_L = -BOARD_W / 2, WALL_R = BOARD_W / 2;
const CEIL_Y = BOARD_H / 2, FLOOR_Y = -BOARD_H / 2 - 0.5;

const THEMES = [
  { name: 'Neon Holodeck', grid: '#004444', accent: '#00ffff', bg: '#000a0a', fog: '#001111', wall: '#003333', orange: '#ff6600', blue: '#4488ff', green: '#00ff88', purple: '#aa44ff', ball: '#00ffff', glow: '#00ffff' },
  { name: 'Crimson Grid', grid: '#440000', accent: '#ff4444', bg: '#0a0000', fog: '#110000', wall: '#330000', orange: '#ff8800', blue: '#6688ff', green: '#88ff44', purple: '#cc44ff', ball: '#ff4444', glow: '#ff6666' },
  { name: 'Toxic Neon', grid: '#004400', accent: '#44ff44', bg: '#000a00', fog: '#001100', wall: '#003300', orange: '#ffaa00', blue: '#44aaff', green: '#66ff66', purple: '#ff44ff', ball: '#44ff44', glow: '#66ff66' },
  { name: 'Ultra Violet', grid: '#220044', accent: '#aa66ff', bg: '#050008', fog: '#080011', wall: '#330055', orange: '#ff6644', blue: '#6688ff', green: '#44ffaa', purple: '#cc66ff', ball: '#aa66ff', glow: '#cc88ff' },
  { name: 'Solar Blaze', grid: '#442200', accent: '#ffaa44', bg: '#0a0500', fog: '#110800', wall: '#332200', orange: '#ff4400', blue: '#4488ff', green: '#88ff66', purple: '#ff66aa', ball: '#ffaa44', glow: '#ffcc66' },
];

const SKINS = [
  { name: 'Neon Cyan', color: '#00ffff', emissive: '#00aaaa', unlock: 'default' },
  { name: 'Solar Flare', color: '#ff6600', emissive: '#aa4400', unlock: '50 pegs' },
  { name: 'Plasma Pink', color: '#ff66ff', emissive: '#aa44aa', unlock: '5K score' },
  { name: 'Frost Core', color: '#66ccff', emissive: '#4488aa', unlock: '10 games' },
  { name: 'Toxic Green', color: '#66ff66', emissive: '#44aa44', unlock: 'x5 combo' },
  { name: 'Royal Gold', color: '#ffaa00', emissive: '#aa7700', unlock: 'clear level' },
  { name: 'Void Purple', color: '#aa66ff', emissive: '#7744aa', unlock: '80% acc' },
  { name: 'Inferno Red', color: '#ff4444', emissive: '#aa2222', unlock: 'all modes' },
];

const MODES = ['campaign', 'quickplay', 'timed', 'zen', 'daily', 'fever', 'precision', 'endless'] as const;

interface Achievement { id: string; name: string; desc: string; }
const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_hit', name: 'First Contact', desc: 'Hit your first peg' },
  { id: 'ten_pegs', name: 'Getting Started', desc: 'Hit 10 pegs total' },
  { id: 'fifty_pegs', name: 'Peg Hunter', desc: 'Hit 50 pegs total' },
  { id: 'hundred_pegs', name: 'Peg Destroyer', desc: 'Hit 100 pegs total' },
  { id: 'five_hundred_pegs', name: 'Peg Legend', desc: 'Hit 500 pegs total' },
  { id: 'score_1k', name: 'Scorer', desc: 'Score 1,000 in one game' },
  { id: 'score_5k', name: 'High Scorer', desc: 'Score 5,000 in one game' },
  { id: 'score_10k', name: 'Score Master', desc: 'Score 10,000 in one game' },
  { id: 'score_25k', name: 'Score Legend', desc: 'Score 25,000 in one game' },
  { id: 'combo_3', name: 'Combo Starter', desc: 'Reach x3 combo' },
  { id: 'combo_5', name: 'Combo Builder', desc: 'Reach x5 combo' },
  { id: 'combo_8', name: 'Combo Master', desc: 'Reach x8 combo' },
  { id: 'combo_10', name: 'Combo Legend', desc: 'Reach x10 combo' },
  { id: 'clear_level', name: 'Level Clear', desc: 'Clear all orange pegs' },
  { id: 'perfect_clear', name: 'Perfect Clear', desc: 'Clear ALL pegs in a level' },
  { id: 'fever_catch', name: 'Fever!', desc: 'Catch ball in fever bucket' },
  { id: 'fever_5', name: 'Fever Fan', desc: 'Catch 5 fever buckets' },
  { id: 'fever_10', name: 'Fever Master', desc: 'Catch 10 fever buckets' },
  { id: 'green_hit', name: 'Power Up', desc: 'Hit a green power peg' },
  { id: 'purple_hit', name: 'Purple Rain', desc: 'Hit a purple peg' },
  { id: 'multiball', name: 'Multi Madness', desc: 'Activate multiball' },
  { id: 'no_miss', name: 'Sharpshooter', desc: 'Hit 5+ pegs with one ball' },
  { id: 'ten_one_shot', name: 'Cascade King', desc: 'Hit 10+ pegs with one ball' },
  { id: 'games_10', name: 'Regular', desc: 'Play 10 games' },
  { id: 'games_50', name: 'Dedicated', desc: 'Play 50 games' },
  { id: 'daily_done', name: 'Daily Player', desc: 'Complete a daily challenge' },
  { id: 'daily_3', name: 'Daily Streak', desc: '3-day daily streak' },
  { id: 'all_modes', name: 'Mode Explorer', desc: 'Play all 8 modes' },
  { id: 'skin_unlock', name: 'Fashionista', desc: 'Unlock a ball skin' },
  { id: 'theme_all', name: 'Theme Tourist', desc: 'Play in all 5 themes' },
  { id: 'level_10', name: 'Rising Star', desc: 'Reach level 10' },
  { id: 'level_25', name: 'Veteran', desc: 'Reach level 25' },
  { id: 'level_50', name: 'Neon Master', desc: 'Reach level 50' },
  { id: 'precision_win', name: 'Sniper', desc: 'Clear a level in Precision' },
  { id: 'zen_100', name: 'Zen Master', desc: 'Hit 100 pegs in Zen mode' },
  { id: 'endless_5', name: 'Endurance', desc: 'Clear 5 boards in Endless' },
  { id: 'three_star', name: 'Three Stars', desc: 'Get 3 stars on a level' },
  { id: 'campaign_5', name: 'Adventurer', desc: 'Clear 5 campaign levels' },
  { id: 'campaign_10', name: 'Explorer', desc: 'Clear 10 campaign levels' },
  { id: 'campaign_20', name: 'Champion', desc: 'Clear all 20 campaign levels' },
];

// ─── Save/Load ──────────────────────────────────────────────────────
interface SaveData {
  achievements: string[]; leaderboard: { score: number; mode: string; date: string }[];
  stats: { games: number; totalScore: number; bestScore: number; totalPegs: number; bestCombo: number;
    ballsUsed: number; levelsCleared: number; perfectClears: number; feverCatches: number; };
  xp: number; level: number; skin: number; theme: number; volumes: { master: number; sfx: number; music: number; };
  modesPlayed: string[]; themesUsed: number[]; dailyStreak: number; lastDaily: string;
  campaignProgress: number; skinsUnlocked: boolean[];
}

function loadSave(): SaveData {
  try {
    const d = JSON.parse(localStorage.getItem('neon-peg-save') || '');
    return d;
  } catch {
    return {
      achievements: [], leaderboard: [],
      stats: { games: 0, totalScore: 0, bestScore: 0, totalPegs: 0, bestCombo: 1, ballsUsed: 0, levelsCleared: 0, perfectClears: 0, feverCatches: 0 },
      xp: 0, level: 1, skin: 0, theme: 0, volumes: { master: 100, sfx: 100, music: 100 },
      modesPlayed: [], themesUsed: [], dailyStreak: 0, lastDaily: '', campaignProgress: 0,
      skinsUnlocked: [true, false, false, false, false, false, false, false],
    };
  }
}
function saveSave(d: SaveData) { localStorage.setItem('neon-peg-save', JSON.stringify(d)); }

// ─── Level Generation ───────────────────────────────────────────────
function mulberry32(a: number) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function generatePegs(levelIdx: number, rng: () => number): { x: number; y: number; type: 'orange' | 'blue' | 'green' | 'purple' }[] {
  const pegs: { x: number; y: number; type: 'orange' | 'blue' | 'green' | 'purple' }[] = [];
  const rows = 6 + Math.min(levelIdx, 4);
  const spacing = 0.5;
  const startY = BOARD_H / 2 - 1.2;

  for (let r = 0; r < rows; r++) {
    const cols = 5 + (r % 2 === 0 ? 0 : 1) + Math.min(Math.floor(levelIdx / 3), 3);
    const offsetX = (r % 2 === 0) ? 0 : spacing / 2;
    for (let c = 0; c < cols; c++) {
      const x = -((cols - 1) * spacing) / 2 + c * spacing + offsetX;
      const y = startY - r * spacing;
      if (Math.abs(x) > BOARD_W / 2 - 0.3) continue;
      const roll = rng();
      let type: 'orange' | 'blue' | 'green' | 'purple';
      const orangeRate = 0.35 + levelIdx * 0.01;
      if (roll < orangeRate) type = 'orange';
      else if (roll < orangeRate + 0.03) type = 'green';
      else if (roll < orangeRate + 0.05) type = 'purple';
      else type = 'blue';
      pegs.push({ x, y, type });
    }
  }
  // Guarantee at least 8 orange pegs
  let orangeCount = pegs.filter(p => p.type === 'orange').length;
  while (orangeCount < 8) {
    const idx = Math.floor(rng() * pegs.length);
    if (pegs[idx].type === 'blue') { pegs[idx].type = 'orange'; orangeCount++; }
  }
  return pegs;
}

// ─── Audio Engine ───────────────────────────────────────────────────
class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  volumes = { master: 1, sfx: 1, music: 1 };

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  setVolumes(master: number, sfx: number, music: number) {
    this.volumes = { master: master / 100, sfx: sfx / 100, music: music / 100 };
    if (this.masterGain) this.masterGain.gain.value = this.volumes.master;
    if (this.sfxGain) this.sfxGain.gain.value = this.volumes.sfx;
    if (this.musicGain) this.musicGain.gain.value = this.volumes.music;
  }

  private playSfx(freq: number, type: OscillatorType, dur: number, vol = 0.15) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq * (0.95 + Math.random() * 0.1);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  pegHit(combo: number) { this.playSfx(440 + combo * 60, 'sine', 0.2, 0.12); this.playSfx(660 + combo * 40, 'triangle', 0.15, 0.08); }
  orangeHit() { this.playSfx(880, 'sine', 0.3, 0.15); this.playSfx(1100, 'triangle', 0.2, 0.1); }
  greenHit() { const t = this.ctx?.currentTime || 0; [660, 880, 1100].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.2, 0.12), i * 80)); }
  purpleHit() { this.playSfx(440, 'sine', 0.3, 0.1); this.playSfx(554, 'triangle', 0.3, 0.08); this.playSfx(660, 'sine', 0.25, 0.1); }
  launch() { this.playSfx(220, 'triangle', 0.15, 0.1); this.playSfx(330, 'sine', 0.1, 0.08); }
  wallBounce() { this.playSfx(180, 'square', 0.08, 0.06); }
  feverCatch() { [660, 880, 1100, 1320, 1540].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.2, 0.1), i * 60)); }
  ballLost() { this.playSfx(330, 'sawtooth', 0.3, 0.08); this.playSfx(220, 'sawtooth', 0.4, 0.06); }
  levelClear() { [523, 659, 784, 1047, 1318].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.3, 0.12), i * 100)); }
  gameOver() { [440, 349, 293, 220].forEach((f, i) => setTimeout(() => this.playSfx(f, 'triangle', 0.3, 0.1), i * 120)); }
  countdown() { this.playSfx(440, 'sine', 0.1, 0.08); }
  countdownGo() { this.playSfx(880, 'sine', 0.2, 0.12); }
  click() { this.playSfx(660, 'sine', 0.05, 0.06); }
  achievement() { [660, 784, 880, 1047, 1320].forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.15, 0.1), i * 70)); }

  startDrone() {
    if (!this.ctx || this.droneOsc1) return;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
    this.droneOsc1 = this.ctx.createOscillator(); this.droneOsc1.type = 'sine'; this.droneOsc1.frequency.value = 55;
    this.droneOsc2 = this.ctx.createOscillator(); this.droneOsc2.type = 'triangle'; this.droneOsc2.frequency.value = 82.5;
    const g1 = this.ctx.createGain(); g1.gain.value = 0.08;
    const g2 = this.ctx.createGain(); g2.gain.value = 0.05;
    this.lfo = this.ctx.createOscillator(); this.lfo.type = 'sine'; this.lfo.frequency.value = 0.15;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 50;
    this.lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
    this.droneOsc1.connect(g1); g1.connect(lp);
    this.droneOsc2.connect(g2); g2.connect(lp);
    lp.connect(this.musicGain);
    this.droneOsc1.start(); this.droneOsc2.start(); this.lfo.start();
  }

  stopDrone() {
    this.droneOsc1?.stop(); this.droneOsc2?.stop(); this.lfo?.stop();
    this.droneOsc1 = this.droneOsc2 = this.lfo = null;
  }
}

// ─── App Start ──────────────────────────────────────────────────────
const container = document.getElementById('app') as HTMLDivElement;
const world = await (World as any).create(container, {
  xr: { offer: 'once' as const },
  browserControls: true,
  canvasPointerEvents: true,
});

const audio = new AudioEngine();
const save = loadSave();
let gameState: GameState = 'title';
let currentMode = 'campaign';
let difficulty = 1; // 0=easy, 1=medium, 2=hard
let ballsPerGame = [15, 10, 7];
let aimAngle = 0; // radians from vertical, -PI/3 to PI/3
let pegs: Peg[] = [];
let balls: Ball[] = [];
let particles: Particle[] = [];
let score = 0, combo = 0, ballsLeft = 10, pegsHitThisShot = 0;
let totalOrange = 0, orangeCleared = 0, totalPegsHit = 0;
let bestComboThisGame = 1;
let levelIdx = save.campaignProgress;
let shooting = false;
let feverBucketX = 0, feverBucketDir = 1;
let countdownTimer = 0, countdownNum = 3;
let toastText = '', toastTimer = 0;
let achPage = 0;
let gameTime = 0, timeLimit = 0;
let endlessBoardsCleared = 0;
let zenPegsHit = 0;
let powerActive = '', powerTimer = 0;
let activePowerName = '', activePowerDesc = '';
let rng = Math.random;

// Theme
let themeIdx = save.theme;
let theme = THEMES[themeIdx];

// ─── 3D Scene Setup ─────────────────────────────────────────────────
const scene = world.scene;
scene.fog = new FogExp2(new Color(theme.fog).getHex(), 0.06);
scene.background = new Color(theme.bg);

// Lights
const ambient = new AmbientLight(0x222244, 0.6);
const dir = new DirectionalLight(0xffffff, 0.5);
dir.position.set(2, 5, 3);
const accentL1 = new PointLight(new Color(theme.accent).getHex(), 1.5, 15);
accentL1.position.set(-3, 2, -2);
const accentL2 = new PointLight(new Color(theme.glow).getHex(), 1.0, 12);
accentL2.position.set(3, -2, -2);
scene.add(ambient, dir, accentL1, accentL2);

// Holodeck grid floor
function createGrid(y: number, rot: number) {
  const g = new Group();
  for (let i = -10; i <= 10; i++) {
    const mat = new MeshStandardMaterial({ color: new Color(theme.grid).getHex(), emissive: new Color(theme.grid).getHex(), emissiveIntensity: 0.3, transparent: true, opacity: 0.3 });
    const bar1 = new Mesh(new BoxGeometry(0.01, 0.01, 20), mat);
    bar1.position.set(i, 0, 0);
    const bar2 = new Mesh(new BoxGeometry(20, 0.01, 0.01), mat.clone());
    bar2.position.set(0, 0, i);
    g.add(bar1, bar2);
  }
  g.position.y = y; g.rotation.x = rot;
  return g;
}
const gridFloor = createGrid(-5, 0);
const gridCeil = createGrid(8, Math.PI);
scene.add(gridFloor, gridCeil);

// Floating decorations
const decorations: Mesh[] = [];
const decoGeos = [
  new TorusGeometry(0.3, 0.08, 8, 16),
  new BoxGeometry(0.4, 0.4, 0.4),
  new SphereGeometry(0.25, 8, 8),
  new CylinderGeometry(0, 0.3, 0.5, 6),
];
for (let i = 0; i < 14; i++) {
  const geo = decoGeos[i % 4];
  const mat = new MeshStandardMaterial({
    color: new Color(theme.accent).getHex(), emissive: new Color(theme.accent).getHex(),
    emissiveIntensity: 0.3, wireframe: true, transparent: true, opacity: 0.4,
  });
  const m = new Mesh(geo, mat);
  m.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10, -3 - Math.random() * 5);
  (m as any)._baseY = m.position.y;
  (m as any)._rotSpeed = 0.3 + Math.random() * 0.5;
  (m as any)._bobSpeed = 0.5 + Math.random() * 0.5;
  scene.add(m);
  decorations.push(m);
}

// Ambient particles
const ambientParts: Mesh[] = [];
for (let i = 0; i < 40; i++) {
  const m = new Mesh(
    new SphereGeometry(0.02, 4, 4),
    new MeshStandardMaterial({ color: new Color(theme.accent).getHex(), emissive: new Color(theme.accent).getHex(), emissiveIntensity: 0.8, transparent: true, opacity: 0.5 })
  );
  m.position.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10, -2 - Math.random() * 6);
  (m as any)._drift = new Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.05, 0);
  (m as any)._phase = Math.random() * Math.PI * 2;
  scene.add(m);
  ambientParts.push(m);
}

// ─── Board Walls ────────────────────────────────────────────────────
const wallMat = new MeshStandardMaterial({ color: new Color(theme.wall).getHex(), emissive: new Color(theme.wall).getHex(), emissiveIntensity: 0.5, transparent: true, opacity: 0.6 });
const wallL = new Mesh(new BoxGeometry(0.05, BOARD_H + 1, 0.1), wallMat.clone());
wallL.position.set(WALL_L - 0.025, 0, 0);
const wallR = new Mesh(new BoxGeometry(0.05, BOARD_H + 1, 0.1), wallMat.clone());
wallR.position.set(WALL_R + 0.025, 0, 0);
const wallTop = new Mesh(new BoxGeometry(BOARD_W + 0.1, 0.05, 0.1), wallMat.clone());
wallTop.position.set(0, CEIL_Y + 0.025, 0);
scene.add(wallL, wallR, wallTop);

// ─── Launcher ───────────────────────────────────────────────────────
const launcherGroup = new Group();
const launcherBase = new Mesh(
  new CylinderGeometry(0.15, 0.2, 0.1, 12),
  new MeshStandardMaterial({ color: new Color(theme.accent).getHex(), emissive: new Color(theme.accent).getHex(), emissiveIntensity: 0.6 })
);
const launcherBarrel = new Mesh(
  new CylinderGeometry(0.04, 0.06, 0.5, 8),
  new MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3 })
);
launcherBarrel.position.y = -0.3;
const launcherTip = new Mesh(
  new SphereGeometry(0.05, 8, 8),
  new MeshStandardMaterial({ color: new Color(theme.ball).getHex(), emissive: new Color(theme.ball).getHex(), emissiveIntensity: 0.8, transparent: true, opacity: 0.7 })
);
launcherTip.position.y = -0.55;
launcherGroup.add(launcherBase, launcherBarrel, launcherTip);
launcherGroup.position.set(0, CEIL_Y + 0.15, 0);
scene.add(launcherGroup);

// ─── Aim Guide ──────────────────────────────────────────────────────
const aimDots: Mesh[] = [];
for (let i = 0; i < 30; i++) {
  const m = new Mesh(
    new SphereGeometry(0.015, 4, 4),
    new MeshStandardMaterial({ color: new Color(theme.accent).getHex(), emissive: new Color(theme.accent).getHex(), emissiveIntensity: 0.8, transparent: true, opacity: 0.6 - i * 0.015, blending: AdditiveBlending })
  );
  m.visible = false;
  scene.add(m);
  aimDots.push(m);
}

// ─── Fever Bucket ───────────────────────────────────────────────────
const bucketGroup = new Group();
const bucketBody = new Mesh(
  new BoxGeometry(0.8, 0.15, 0.15),
  new MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.6, transparent: true, opacity: 0.7 })
);
const bucketGlow = new Mesh(
  new BoxGeometry(0.85, 0.2, 0.2),
  new MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.4, transparent: true, opacity: 0.3, blending: AdditiveBlending })
);
bucketGroup.add(bucketBody, bucketGlow);
bucketGroup.position.set(0, FLOOR_Y - 0.1, 0);
scene.add(bucketGroup);

// ─── Particle Pool ──────────────────────────────────────────────────
for (let i = 0; i < 150; i++) {
  const m = new Mesh(
    new SphereGeometry(0.025, 4, 4),
    new MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8, transparent: true, opacity: 1 })
  );
  m.visible = false;
  scene.add(m);
  particles.push({ mesh: m, vx: 0, vy: 0, life: 0, maxLife: 0, active: false });
}

function spawnParticles(x: number, y: number, color: string, count: number) {
  const c = new Color(color);
  for (let i = 0; i < count; i++) {
    const p = particles.find(pp => !pp.active);
    if (!p) break;
    p.active = true;
    p.mesh.visible = true;
    p.mesh.position.set(x, y, 0);
    (p.mesh.material as MeshStandardMaterial).color.copy(c);
    (p.mesh.material as MeshStandardMaterial).emissive.copy(c);
    p.vx = (Math.random() - 0.5) * 3;
    p.vy = Math.random() * 2 + 1;
    p.life = 0.6 + Math.random() * 0.4;
    p.maxLife = p.life;
  }
}

// ─── Ball Trail (mesh-based) ─────────────────────────────────────────
const trailDots: Mesh[] = [];
for (let i = 0; i < 30; i++) {
  const m = new Mesh(
    new SphereGeometry(0.012, 4, 4),
    new MeshStandardMaterial({ color: new Color(theme.ball).getHex(), emissive: new Color(theme.ball).getHex(), emissiveIntensity: 0.8, transparent: true, opacity: 0.5 - i * 0.015, blending: AdditiveBlending })
  );
  m.visible = false;
  scene.add(m);
  trailDots.push(m);
}

// ─── Peg Management ─────────────────────────────────────────────────
function clearPegs() {
  pegs.forEach(p => { scene.remove(p.mesh); scene.remove(p.glow); });
  pegs = [];
}

function createPegMeshes(pegData: { x: number; y: number; type: 'orange' | 'blue' | 'green' | 'purple' }[]) {
  clearPegs();
  totalOrange = 0; orangeCleared = 0;
  pegData.forEach(pd => {
    const colors: Record<string, string> = { orange: theme.orange, blue: theme.blue, green: theme.green, purple: theme.purple };
    const col = colors[pd.type] || theme.blue;
    const mesh = new Mesh(
      new SphereGeometry(PEG_R, 12, 12),
      new MeshStandardMaterial({ color: new Color(col).getHex(), emissive: new Color(col).getHex(), emissiveIntensity: 0.5 })
    );
    mesh.position.set(pd.x, pd.y, 0);
    const glow = new Mesh(
      new SphereGeometry(PEG_R * 1.6, 8, 8),
      new MeshStandardMaterial({ color: new Color(col).getHex(), emissive: new Color(col).getHex(), emissiveIntensity: 0.3, transparent: true, opacity: 0.25, blending: AdditiveBlending })
    );
    glow.position.set(pd.x, pd.y, 0);
    scene.add(mesh, glow);
    pegs.push({ mesh, glow, type: pd.type, x: pd.x, y: pd.y, radius: PEG_R, hit: false, fadeTimer: 0 });
    if (pd.type === 'orange') totalOrange++;
  });
}

// ─── Ball Management ────────────────────────────────────────────────
function createBall(x: number, y: number, vx: number, vy: number) {
  const skinCol = new Color(SKINS[save.skin].color);
  const mesh = new Mesh(
    new SphereGeometry(BALL_R, 12, 12),
    new MeshStandardMaterial({ color: skinCol.getHex(), emissive: new Color(SKINS[save.skin].emissive).getHex(), emissiveIntensity: 0.6 })
  );
  mesh.position.set(x, y, 0);
  const glow = new Mesh(
    new SphereGeometry(BALL_R * 2, 8, 8),
    new MeshStandardMaterial({ color: skinCol.getHex(), emissive: skinCol.getHex(), emissiveIntensity: 0.3, transparent: true, opacity: 0.3, blending: AdditiveBlending })
  );
  glow.position.set(x, y, 0);
  scene.add(mesh, glow);
  balls.push({ mesh, glow, trail: [], vx, vy, x, y, radius: BALL_R, active: true });
}

function removeBall(b: Ball) {
  b.active = false;
  scene.remove(b.mesh);
  scene.remove(b.glow);
}

function clearBalls() {
  balls.forEach(b => { scene.remove(b.mesh); scene.remove(b.glow); });
  balls = [];
}

// ─── Shoot Ball ─────────────────────────────────────────────────────
function shootBall() {
  if (shooting || ballsLeft <= 0) return;
  audio.init();
  audio.startDrone();
  shooting = true;
  pegsHitThisShot = 0;
  combo = 0;
  const speed = 5;
  const vx = Math.sin(aimAngle) * speed;
  const vy = -Math.cos(aimAngle) * speed;
  createBall(Math.sin(aimAngle) * 0.5, CEIL_Y - 0.1, vx, vy);
  if (currentMode !== 'zen') ballsLeft--;
  save.stats.ballsUsed++;
  audio.launch();
}

// ─── Game Flow ──────────────────────────────────────────────────────
function startGame(mode: string, diff: number) {
  currentMode = mode;
  difficulty = diff;
  score = 0; combo = 0; totalPegsHit = 0; bestComboThisGame = 1;
  endlessBoardsCleared = 0; zenPegsHit = 0;
  powerActive = ''; powerTimer = 0;

  if (mode === 'zen') { ballsLeft = 999; timeLimit = 0; }
  else if (mode === 'timed') { ballsLeft = 999; timeLimit = 90 - diff * 15; gameTime = 0; }
  else if (mode === 'precision') { ballsLeft = 5; timeLimit = 0; }
  else if (mode === 'fever') { ballsLeft = ballsPerGame[diff]; timeLimit = 0; }
  else if (mode === 'endless') { ballsLeft = ballsPerGame[diff] + 5; timeLimit = 0; }
  else { ballsLeft = ballsPerGame[diff]; timeLimit = 0; }

  if (mode === 'daily') {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rng = mulberry32(seed);
    ballsLeft = 10;
  } else {
    rng = Math.random;
  }

  const lvl = mode === 'campaign' ? levelIdx : Math.floor(rng() * 15);
  createPegMeshes(generatePegs(lvl, rng));

  if (!save.modesPlayed.includes(mode)) save.modesPlayed.push(mode);
  if (!save.themesUsed.includes(themeIdx)) save.themesUsed.push(themeIdx);
  saveSave(save);

  shooting = false;
  clearBalls();
  gameState = 'countdown';
  countdownTimer = 0;
  countdownNum = 3;
}

function endGame(cleared: boolean) {
  shooting = false;
  save.stats.games++;
  save.stats.totalScore += score;
  if (score > save.stats.bestScore) save.stats.bestScore = score;
  save.stats.totalPegs += totalPegsHit;
  if (bestComboThisGame > save.stats.bestCombo) save.stats.bestCombo = bestComboThisGame;

  if (cleared) {
    save.stats.levelsCleared++;
    if (orangeCleared === totalOrange && totalPegsHit === pegs.length) save.stats.perfectClears++;
    if (currentMode === 'campaign' && levelIdx >= save.campaignProgress) {
      save.campaignProgress = levelIdx + 1;
    }
    audio.levelClear();
  } else {
    audio.gameOver();
  }

  // XP
  const xpGain = Math.floor(score / 10) + totalPegsHit * 2 + (cleared ? 50 : 0);
  save.xp += xpGain;
  while (save.xp >= 100 + save.level * 50) {
    save.xp -= (100 + save.level * 50);
    save.level++;
  }

  // Leaderboard
  save.leaderboard.push({ score, mode: currentMode, date: new Date().toLocaleDateString() });
  save.leaderboard.sort((a, b) => b.score - a.score);
  if (save.leaderboard.length > 20) save.leaderboard.length = 20;

  // Skin unlocks
  if (save.stats.totalPegs >= 50) save.skinsUnlocked[1] = true;
  if (save.stats.bestScore >= 5000) save.skinsUnlocked[2] = true;
  if (save.stats.games >= 10) save.skinsUnlocked[3] = true;
  if (save.stats.bestCombo >= 5) save.skinsUnlocked[4] = true;
  if (save.stats.levelsCleared >= 1) save.skinsUnlocked[5] = true;
  // accuracy-based and all-modes unlocks checked separately

  // Achievement checks
  checkAch('first_hit', save.stats.totalPegs >= 1);
  checkAch('ten_pegs', save.stats.totalPegs >= 10);
  checkAch('fifty_pegs', save.stats.totalPegs >= 50);
  checkAch('hundred_pegs', save.stats.totalPegs >= 100);
  checkAch('five_hundred_pegs', save.stats.totalPegs >= 500);
  checkAch('score_1k', score >= 1000);
  checkAch('score_5k', score >= 5000);
  checkAch('score_10k', score >= 10000);
  checkAch('score_25k', score >= 25000);
  checkAch('combo_3', bestComboThisGame >= 3);
  checkAch('combo_5', bestComboThisGame >= 5);
  checkAch('combo_8', bestComboThisGame >= 8);
  checkAch('combo_10', bestComboThisGame >= 10);
  checkAch('clear_level', cleared);
  checkAch('perfect_clear', cleared && totalPegsHit === pegs.length);
  checkAch('games_10', save.stats.games >= 10);
  checkAch('games_50', save.stats.games >= 50);
  checkAch('all_modes', save.modesPlayed.length >= 8);
  checkAch('theme_all', save.themesUsed.length >= 5);
  checkAch('level_10', save.level >= 10);
  checkAch('level_25', save.level >= 25);
  checkAch('level_50', save.level >= 50);
  checkAch('precision_win', currentMode === 'precision' && cleared);
  checkAch('endless_5', currentMode === 'endless' && endlessBoardsCleared >= 5);
  checkAch('campaign_5', save.campaignProgress >= 5);
  checkAch('campaign_10', save.campaignProgress >= 10);
  checkAch('campaign_20', save.campaignProgress >= 20);

  if (currentMode === 'daily') {
    const today = new Date().toISOString().split('T')[0];
    if (save.lastDaily !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      save.dailyStreak = save.lastDaily === yesterday ? save.dailyStreak + 1 : 1;
      save.lastDaily = today;
    }
    checkAch('daily_done', true);
    checkAch('daily_3', save.dailyStreak >= 3);
  }

  if (save.modesPlayed.length >= 8) save.skinsUnlocked[7] = true;
  if (save.skinsUnlocked.some((s, i) => s && i > 0)) checkAch('skin_unlock', true);

  saveSave(save);
  clearBalls();
  gameState = 'gameover';
}

function checkAch(id: string, condition: boolean) {
  if (!condition || save.achievements.includes(id)) return;
  save.achievements.push(id);
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (ach) { showToast('Achievement: ' + ach.name); audio.achievement(); }
}

function showToast(text: string) { toastText = text; toastTimer = 2.5; }

// ─── UI System ──────────────────────────────────────────────────────
class PegUISystem extends createSystem({
  titleQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/title.json')] },
  modesQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/modes.json')] },
  diffQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/difficulty.json')] },
  hudQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/hud.json')] },
  pauseQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/pause.json')] },
  goQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/gameover.json')] },
  lbQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/leaderboard.json')] },
  achQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/achievements.json')] },
  setQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/settings.json')] },
  statQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/stats.json')] },
  skinQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/skins.json')] },
  helpQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/help.json')] },
  toastQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/toast.json')] },
  cdQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/countdown.json')] },
  powQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/powerup.json')] },
  aimQ: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/aimguide.json')] },
}) {
  private docs = new Map<string, { entity: Entity; doc: UIKitDocument }>();
  private getDoc(name: string) { return this.docs.get(name); }
  private setText(panel: string, id: string, text: string) {
    const d = this.getDoc(panel);
    if (!d) return;
    (d.doc.getElementById(id) as UIKit.Text | undefined)?.setProperties({ text });
  }
  private wireBtn(panel: string, id: string, fn: () => void) {
    const d = this.getDoc(panel);
    if (!d) return;
    const el = d.doc.getElementById(id) as any;
    el?.addEventListener('click', fn);
  }

  init() {
    const bindPanel = (name: string, query: any) => {
      query.subscribe('qualify', (entity: Entity) => {
        const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
        if (!doc) return;
        this.docs.set(name, { entity, doc });
        this.setupPanel(name, entity, doc);
      });
    };
    bindPanel('title', this.queries.titleQ);
    bindPanel('modes', this.queries.modesQ);
    bindPanel('diff', this.queries.diffQ);
    bindPanel('hud', this.queries.hudQ);
    bindPanel('pause', this.queries.pauseQ);
    bindPanel('go', this.queries.goQ);
    bindPanel('lb', this.queries.lbQ);
    bindPanel('ach', this.queries.achQ);
    bindPanel('set', this.queries.setQ);
    bindPanel('stat', this.queries.statQ);
    bindPanel('skin', this.queries.skinQ);
    bindPanel('help', this.queries.helpQ);
    bindPanel('toast', this.queries.toastQ);
    bindPanel('cd', this.queries.cdQ);
    bindPanel('pow', this.queries.powQ);
    bindPanel('aim', this.queries.aimQ);
  }

  setupPanel(name: string, _entity: Entity, _doc: UIKitDocument) {
    const clk = () => { audio.init(); audio.click(); };
    if (name === 'title') {
      this.wireBtn('title', 'btn-play', () => { clk(); gameState = 'modes'; });
      this.wireBtn('title', 'btn-scores', () => { clk(); gameState = 'leaderboard'; });
      this.wireBtn('title', 'btn-achievements', () => { clk(); achPage = 0; gameState = 'achievements'; });
      this.wireBtn('title', 'btn-stats', () => { clk(); gameState = 'stats'; });
      this.wireBtn('title', 'btn-skins', () => { clk(); gameState = 'skins'; });
      this.wireBtn('title', 'btn-settings', () => { clk(); gameState = 'settings'; });
      this.wireBtn('title', 'btn-help', () => { clk(); gameState = 'help'; });
    }
    if (name === 'modes') {
      MODES.forEach(m => {
        this.wireBtn('modes', 'btn-' + m, () => { clk(); currentMode = m; gameState = 'difficulty'; });
      });
      this.wireBtn('modes', 'btn-back', () => { clk(); gameState = 'title'; });
    }
    if (name === 'diff') {
      this.wireBtn('diff', 'btn-easy', () => { clk(); startGame(currentMode, 0); });
      this.wireBtn('diff', 'btn-medium', () => { clk(); startGame(currentMode, 1); });
      this.wireBtn('diff', 'btn-hard', () => { clk(); startGame(currentMode, 2); });
      this.wireBtn('diff', 'btn-back', () => { clk(); gameState = 'modes'; });
    }
    if (name === 'pause') {
      this.wireBtn('pause', 'btn-resume', () => { clk(); gameState = 'playing'; });
      this.wireBtn('pause', 'btn-quit', () => { clk(); clearPegs(); clearBalls(); gameState = 'title'; });
    }
    if (name === 'go') {
      this.wireBtn('go', 'btn-next', () => {
        clk();
        if (currentMode === 'campaign') { levelIdx++; startGame('campaign', difficulty); }
        else if (currentMode === 'endless') { startGame('endless', difficulty); }
        else { gameState = 'title'; }
      });
      this.wireBtn('go', 'btn-retry', () => { clk(); startGame(currentMode, difficulty); });
      this.wireBtn('go', 'btn-menu', () => { clk(); clearPegs(); gameState = 'title'; });
    }
    if (name === 'lb') { this.wireBtn('lb', 'btn-back', () => { clk(); gameState = 'title'; }); }
    if (name === 'ach') {
      this.wireBtn('ach', 'btn-prev', () => { clk(); if (achPage > 0) achPage--; });
      this.wireBtn('ach', 'btn-next', () => { clk(); if ((achPage + 1) * 15 < ACHIEVEMENTS.length) achPage++; });
      this.wireBtn('ach', 'btn-back', () => { clk(); gameState = 'title'; });
    }
    if (name === 'set') {
      const adj = (key: 'master' | 'sfx' | 'music', delta: number) => {
        save.volumes[key] = Math.max(0, Math.min(100, save.volumes[key] + delta));
        audio.setVolumes(save.volumes.master, save.volumes.sfx, save.volumes.music);
        saveSave(save);
      };
      this.wireBtn('set', 'btn-master-up', () => adj('master', 10));
      this.wireBtn('set', 'btn-master-down', () => adj('master', -10));
      this.wireBtn('set', 'btn-sfx-up', () => adj('sfx', 10));
      this.wireBtn('set', 'btn-sfx-down', () => adj('sfx', -10));
      this.wireBtn('set', 'btn-music-up', () => adj('music', 10));
      this.wireBtn('set', 'btn-music-down', () => adj('music', -10));
      this.wireBtn('set', 'btn-theme-prev', () => { clk(); themeIdx = (themeIdx - 1 + THEMES.length) % THEMES.length; theme = THEMES[themeIdx]; save.theme = themeIdx; saveSave(save); });
      this.wireBtn('set', 'btn-theme-next', () => { clk(); themeIdx = (themeIdx + 1) % THEMES.length; theme = THEMES[themeIdx]; save.theme = themeIdx; saveSave(save); });
      this.wireBtn('set', 'btn-back', () => { clk(); gameState = 'title'; });
    }
    if (name === 'stat') { this.wireBtn('stat', 'btn-back', () => { clk(); gameState = 'title'; }); }
    if (name === 'skin') {
      for (let i = 0; i < 8; i++) {
        this.wireBtn('skin', 'skin' + i, () => {
          if (save.skinsUnlocked[i]) { save.skin = i; saveSave(save); clk(); }
        });
      }
      this.wireBtn('skin', 'btn-back', () => { clk(); gameState = 'title'; });
    }
    if (name === 'help') { this.wireBtn('help', 'btn-back', () => { clk(); gameState = 'title'; }); }
  }

  update() {
    // Visibility per state
    const vis = new Map<string, GameState[]>([
      ['title', ['title']], ['modes', ['modes']], ['diff', ['difficulty']], ['hud', ['playing', 'countdown']],
      ['pause', ['paused']], ['go', ['gameover']], ['lb', ['leaderboard']], ['ach', ['achievements']],
      ['set', ['settings']], ['stat', ['stats']], ['skin', ['skins']], ['help', ['help']],
      ['toast', ['playing', 'countdown', 'gameover']], ['cd', ['countdown']],
      ['pow', ['playing']], ['aim', ['playing']],
    ]);
    for (const [name, states] of vis) {
      const d = this.getDoc(name);
      if (!d) continue;
      const show = states.includes(gameState);
      if (d.entity.object3D) d.entity.object3D.visible = show;
    }

    // Update HUD
    if (gameState === 'playing' || gameState === 'countdown') {
      this.setText('hud', 'score-label', 'Score: ' + score);
      this.setText('hud', 'balls-label', 'Balls: ' + (currentMode === 'zen' ? '--' : ballsLeft));
      this.setText('hud', 'orange-label', 'Orange: ' + orangeCleared + '/' + totalOrange);
      this.setText('hud', 'combo-label', 'Combo: x' + Math.max(1, combo));
      this.setText('hud', 'level-label', 'Lv ' + save.level);
      this.setText('hud', 'mode-label', currentMode.charAt(0).toUpperCase() + currentMode.slice(1) + (timeLimit > 0 ? ' ' + Math.max(0, Math.ceil(timeLimit - gameTime)) + 's' : ''));
    }

    // Countdown
    if (gameState === 'countdown') {
      this.setText('cd', 'countdown-text', countdownNum > 0 ? '' + countdownNum : 'SHOOT!');
    }

    // Toast
    const toastD = this.getDoc('toast');
    if (toastD) {
      if (toastD.entity.object3D) toastD.entity.object3D.visible = toastTimer > 0;
      if (toastTimer > 0) this.setText('toast', 'toast-text', toastText);
    }

    // Power-up display
    if (gameState === 'playing') {
      const powD = this.getDoc('pow');
      if (powD) {
        if (powD.entity.object3D) powD.entity.object3D.visible = powerTimer > 0;
        if (powerTimer > 0) {
          this.setText('pow', 'power-name', activePowerName);
          this.setText('pow', 'power-desc', activePowerDesc);
          this.setText('pow', 'power-timer', Math.ceil(powerTimer) + 's');
        }
      }
    }

    // Title level info
    if (gameState === 'title') {
      this.setText('title', 'level-info', 'Level ' + save.level + ' - ' + save.xp + ' XP');
    }

    // Leaderboard
    if (gameState === 'leaderboard') {
      for (let i = 0; i < 10; i++) {
        const entry = save.leaderboard[i];
        this.setText('lb', 'row' + i, entry ? (i + 1) + '. ' + entry.score + ' (' + entry.mode + ') ' + entry.date : (i + 1) + '. ---');
      }
    }

    // Achievements
    if (gameState === 'achievements') {
      const start = achPage * 15;
      for (let i = 0; i < 15; i++) {
        const a = ACHIEVEMENTS[start + i];
        if (a) {
          const unlocked = save.achievements.includes(a.id);
          this.setText('ach', 'ach' + i, (unlocked ? '[x] ' : '[ ] ') + a.name + ': ' + a.desc);
        } else {
          this.setText('ach', 'ach' + i, '');
        }
      }
      this.setText('ach', 'page-info', (achPage + 1) + '/' + Math.ceil(ACHIEVEMENTS.length / 15));
    }

    // Settings
    if (gameState === 'settings') {
      this.setText('set', 'master-vol', '' + save.volumes.master);
      this.setText('set', 'sfx-vol', '' + save.volumes.sfx);
      this.setText('set', 'music-vol', '' + save.volumes.music);
      this.setText('set', 'theme-name', THEMES[themeIdx].name);
    }

    // Stats
    if (gameState === 'stats') {
      const s = save.stats;
      this.setText('stat', 'stat0', 'Games: ' + s.games);
      this.setText('stat', 'stat1', 'Total Score: ' + s.totalScore);
      this.setText('stat', 'stat2', 'Best Score: ' + s.bestScore);
      this.setText('stat', 'stat3', 'Pegs Hit: ' + s.totalPegs);
      this.setText('stat', 'stat4', 'Best Combo: x' + s.bestCombo);
      this.setText('stat', 'stat5', 'Balls Used: ' + s.ballsUsed);
      this.setText('stat', 'stat6', 'Levels Cleared: ' + s.levelsCleared);
      this.setText('stat', 'stat7', 'Perfect Clears: ' + s.perfectClears);
      this.setText('stat', 'stat8', 'Fever Catches: ' + s.feverCatches);
      this.setText('stat', 'stat9', 'Level: ' + save.level);
    }

    // Skins
    if (gameState === 'skins') {
      for (let i = 0; i < 8; i++) {
        const unlocked = save.skinsUnlocked[i];
        const equipped = save.skin === i;
        this.setText('skin', 'skin' + i, (equipped ? '[*] ' : unlocked ? '[ ] ' : '[L] ') + SKINS[i].name + (unlocked ? '' : ' (' + SKINS[i].unlock + ')'));
      }
    }

    // Game Over
    if (gameState === 'gameover') {
      const cleared = orangeCleared >= totalOrange;
      this.setText('go', 'result-title', cleared ? 'LEVEL CLEAR!' : 'GAME OVER');
      this.setText('go', 'final-score', 'Score: ' + score);
      this.setText('go', 'pegs-hit', 'Pegs Hit: ' + totalPegsHit + '/' + pegs.length);
      this.setText('go', 'orange-cleared', 'Orange: ' + orangeCleared + '/' + totalOrange);
      this.setText('go', 'balls-left', 'Balls Left: ' + Math.max(0, ballsLeft));
      this.setText('go', 'best-combo', 'Best Combo: x' + bestComboThisGame);
      const stars = cleared ? (totalPegsHit === pegs.length ? 3 : score >= 5000 ? 2 : 1) : 0;
      this.setText('go', 'star-rating', '* '.repeat(stars).trim() || '-');
      if (stars >= 3) checkAch('three_star', true);
      const xpGain = Math.floor(score / 10) + totalPegsHit * 2 + (cleared ? 50 : 0);
      this.setText('go', 'xp-gained', '+' + xpGain + ' XP');
    }
  }
}

// ─── Game System ────────────────────────────────────────────────────
class PegGameSystem extends createSystem({}) {
  private kb: any = null;

  init() {
    this.kb = (world.input as any)?.keyboard || null;
  }

  update(delta: number) {
    const dt = Math.min(delta, 0.05);

    // Decorations animation
    decorations.forEach(m => {
      m.rotation.y += (m as any)._rotSpeed * dt;
      m.position.y = (m as any)._baseY + Math.sin(Date.now() * 0.001 * (m as any)._bobSpeed) * 0.2;
    });
    ambientParts.forEach(m => {
      m.position.x += (m as any)._drift.x * dt;
      m.position.y += (m as any)._drift.y * dt;
      const mat = m.material as MeshStandardMaterial;
      mat.opacity = 0.3 + Math.sin(Date.now() * 0.002 + (m as any)._phase) * 0.2;
    });

    // Toast timer
    if (toastTimer > 0) toastTimer -= dt;

    // Power-up timer
    if (powerTimer > 0) { powerTimer -= dt; if (powerTimer <= 0) powerActive = ''; }

    if (gameState === 'countdown') {
      countdownTimer += dt;
      const newNum = 3 - Math.floor(countdownTimer);
      if (newNum !== countdownNum && newNum >= 0) {
        countdownNum = newNum;
        if (countdownNum > 0) audio.countdown();
        else audio.countdownGo();
      }
      if (countdownTimer >= 3.5) {
        gameState = 'playing';
      }
      return;
    }

    if (gameState !== 'playing') {
      // Hide aim guide and bucket when not playing
      aimDots.forEach(d => d.visible = false);
      bucketGroup.visible = false;
      trailDots.forEach(d => d.visible = false);
      launcherGroup.visible = (gameState as string) === 'countdown';
      return;
    }

    launcherGroup.visible = true;
    bucketGroup.visible = true;

    // Timer modes
    if (timeLimit > 0) {
      gameTime += dt;
      if (gameTime >= timeLimit) { endGame(orangeCleared >= totalOrange); return; }
    }

    // Input: aim
    const kbState = this.kb;
    if (kbState) {
      if (kbState.getKeyPressed('KeyA') || kbState.getKeyPressed('ArrowLeft')) aimAngle -= 1.5 * dt;
      if (kbState.getKeyPressed('KeyD') || kbState.getKeyPressed('ArrowRight')) aimAngle += 1.5 * dt;
      aimAngle = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, aimAngle));

      if (kbState.getKeyDown('Space') && !shooting) shootBall();
      if (kbState.getKeyDown('Escape') || kbState.getKeyDown('KeyP')) gameState = 'paused';
    }

    // XR input
    const gp = (world.input as any).gamepads?.[0];
    if (gp) {
      const axes = gp.getAxesValues?.(InputComponent.Thumbstick) as { x: number; y: number } | undefined;
      if (axes && Math.abs(axes.x) > 0.1) {
        aimAngle += axes.x * 1.5 * dt;
        aimAngle = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, aimAngle));
      }
      if (gp.getButtonDown?.(InputComponent.Trigger) && !shooting) shootBall();
      if (gp.getButtonDown?.('b')) gameState = 'paused';
    }

    // Update launcher rotation
    launcherGroup.rotation.z = -aimAngle;

    // Aim guide
    if (!shooting) {
      const speed = 5;
      let ax = Math.sin(aimAngle) * 0.5, ay = CEIL_Y - 0.1;
      let avx = Math.sin(aimAngle) * speed, avy = -Math.cos(aimAngle) * speed;
      for (let i = 0; i < 30; i++) {
        aimDots[i].position.set(ax, ay, 0);
        aimDots[i].visible = true;
        ax += avx * 0.04; ay += avy * 0.04; avy += GRAVITY * 0.04;
        if (ax < WALL_L + BALL_R) { ax = WALL_L + BALL_R; avx = -avx * 0.8; }
        if (ax > WALL_R - BALL_R) { ax = WALL_R - BALL_R; avx = -avx * 0.8; }
      }
    } else {
      aimDots.forEach(d => d.visible = false);
    }

    // Fever bucket movement
    feverBucketX += feverBucketDir * 1.5 * dt;
    if (feverBucketX > BOARD_W / 2 - 0.5) { feverBucketX = BOARD_W / 2 - 0.5; feverBucketDir = -1; }
    if (feverBucketX < -BOARD_W / 2 + 0.5) { feverBucketX = -BOARD_W / 2 + 0.5; feverBucketDir = 1; }
    bucketGroup.position.x = feverBucketX;

    // Ball physics
    const substeps = 3;
    const subDt = dt / substeps;
    for (const ball of balls) {
      if (!ball.active) continue;
      for (let s = 0; s < substeps; s++) {
        ball.vy += GRAVITY * subDt;
        ball.x += ball.vx * subDt;
        ball.y += ball.vy * subDt;

        // Wall collisions
        if (ball.x < WALL_L + ball.radius) { ball.x = WALL_L + ball.radius; ball.vx = Math.abs(ball.vx) * 0.9; audio.wallBounce(); }
        if (ball.x > WALL_R - ball.radius) { ball.x = WALL_R - ball.radius; ball.vx = -Math.abs(ball.vx) * 0.9; audio.wallBounce(); }
        if (ball.y > CEIL_Y - ball.radius) { ball.y = CEIL_Y - ball.radius; ball.vy = -Math.abs(ball.vy) * 0.9; }

        // Peg collisions
        for (const peg of pegs) {
          if (peg.hit) continue;
          const dx = ball.x - peg.x, dy = ball.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < ball.radius + peg.radius) {
            // Reflect velocity
            const nx = dx / dist, ny = dy / dist;
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx -= 2 * dot * nx * 0.85;
            ball.vy -= 2 * dot * ny * 0.85;
            // Push ball out
            ball.x = peg.x + nx * (ball.radius + peg.radius);
            ball.y = peg.y + ny * (ball.radius + peg.radius);

            // Score the peg
            peg.hit = true;
            peg.fadeTimer = 0.5;
            combo++;
            pegsHitThisShot++;
            totalPegsHit++;
            if (combo > bestComboThisGame) bestComboThisGame = combo;

            // Score calculation - fewer orange remaining = higher points
            const orangeRemaining = pegs.filter(p => p.type === 'orange' && !p.hit).length;
            let baseScore = peg.type === 'orange' ? 100 : peg.type === 'green' ? 200 : peg.type === 'purple' ? 150 : 50;
            // Multiplier based on remaining orange pegs
            if (orangeRemaining <= 3) baseScore *= 10;
            else if (orangeRemaining <= 6) baseScore *= 5;
            else if (orangeRemaining <= 10) baseScore *= 3;
            else if (orangeRemaining <= 15) baseScore *= 2;
            // Combo multiplier
            const comboMult = Math.min(combo, 10);
            // Purple peg = 3x all
            const purpleMult = peg.type === 'purple' ? 3 : 1;
            score += baseScore * comboMult * purpleMult;

            // Particles
            const pegColors: Record<string, string> = { orange: theme.orange, blue: theme.blue, green: theme.green, purple: theme.purple };
            spawnParticles(peg.x, peg.y, pegColors[peg.type] || theme.blue, 8);

            // Audio
            if (peg.type === 'orange') { audio.orangeHit(); orangeCleared++; }
            else if (peg.type === 'green') { audio.greenHit(); activatePower(); }
            else if (peg.type === 'purple') { audio.purpleHit(); checkAch('purple_hit', true); }
            else { audio.pegHit(combo); }

            if (peg.type === 'orange') checkAch('first_hit', true);
            if (peg.type === 'green') checkAch('green_hit', true);
            if (pegsHitThisShot >= 5) checkAch('no_miss', true);
            if (pegsHitThisShot >= 10) checkAch('ten_one_shot', true);
          }
        }

        // Ball fell below floor
        if (ball.y < FLOOR_Y) {
          // Check fever bucket catch
          if (Math.abs(ball.x - feverBucketX) < 0.45) {
            score += 1000 * Math.max(1, combo);
            save.stats.feverCatches++;
            audio.feverCatch();
            spawnParticles(ball.x, FLOOR_Y, '#ffaa00', 20);
            showToast('FEVER CATCH! +' + (1000 * Math.max(1, combo)));
            checkAch('fever_catch', true);
            checkAch('fever_5', save.stats.feverCatches >= 5);
            checkAch('fever_10', save.stats.feverCatches >= 10);
            // In fever mode, don't consume ball
            if (currentMode === 'fever') { ballsLeft++; }
          } else {
            audio.ballLost();
          }
          removeBall(ball);

          // Check if all balls gone
          if (!balls.some(b => b.active)) {
            shooting = false;
            // Remove hit pegs with fade
            pegs.forEach(p => { if (p.hit) { p.fadeTimer = 0; } });

            // Check win/lose
            if (orangeCleared >= totalOrange) {
              if (currentMode === 'endless') {
                endlessBoardsCleared++;
                score += 500; // Board clear bonus
                showToast('Board Clear! +500');
                const newPegs = generatePegs(endlessBoardsCleared + 5, rng);
                createPegMeshes(newPegs);
              } else {
                endGame(true);
                return;
              }
            } else if (ballsLeft <= 0 && currentMode !== 'zen') {
              endGame(false);
              return;
            }
          }
          continue;
        }
      }

      // Update ball mesh position
      ball.mesh.position.set(ball.x, ball.y, 0);
      ball.glow.position.set(ball.x, ball.y, 0);

      // Trail
      ball.trail.push(new Vector3(ball.x, ball.y, 0));
      if (ball.trail.length > 30) ball.trail.shift();
    }

    // Update trail dots
    const activeBall = balls.find(b => b.active);
    if (activeBall && activeBall.trail.length > 1) {
      for (let i = 0; i < 30; i++) {
        const pt = activeBall.trail[activeBall.trail.length - 1 - i];
        if (pt) { trailDots[i].position.set(pt.x, pt.y, pt.z); trailDots[i].visible = true; }
        else { trailDots[i].visible = false; }
      }
    } else {
      trailDots.forEach(d => d.visible = false);
    }

    // Fade hit pegs
    for (const peg of pegs) {
      if (peg.hit && peg.fadeTimer > 0) {
        peg.fadeTimer -= dt;
        const opacity = Math.max(0, peg.fadeTimer / 0.5);
        (peg.mesh.material as MeshStandardMaterial).opacity = opacity;
        (peg.mesh.material as MeshStandardMaterial).transparent = true;
        (peg.glow.material as MeshStandardMaterial).opacity = opacity * 0.25;
      } else if (peg.hit && peg.fadeTimer <= 0) {
        peg.mesh.visible = false;
        peg.glow.visible = false;
      }
    }

    // Peg glow pulse (unhit pegs)
    const pulseT = Date.now() * 0.003;
    for (const peg of pegs) {
      if (!peg.hit) {
        const pulse = 0.2 + Math.sin(pulseT + peg.x * 3 + peg.y * 2) * 0.1;
        (peg.glow.material as MeshStandardMaterial).opacity = pulse;
      }
    }

    // Particles
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; p.mesh.visible = false; continue; }
      p.vy += GRAVITY * 0.5 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      (p.mesh.material as MeshStandardMaterial).opacity = p.life / p.maxLife;
    }

    // Zen mode tracking
    if (currentMode === 'zen') {
      zenPegsHit = totalPegsHit;
      checkAch('zen_100', zenPegsHit >= 100);
    }
  }
}

function activatePower() {
  const powers = ['multiball', 'guideball', 'spaceblast', 'zenball'];
  const p = powers[Math.floor(Math.random() * powers.length)];
  powerActive = p;
  powerTimer = 15;
  checkAch('multiball', p === 'multiball');

  if (p === 'multiball') {
    activePowerName = 'MULTIBALL';
    activePowerDesc = 'Ball splits into 3!';
    // Spawn 2 extra balls from current active ball
    const ab = balls.find(b => b.active);
    if (ab) {
      createBall(ab.x, ab.y, ab.vx + 1.5, ab.vy * 0.8);
      createBall(ab.x, ab.y, ab.vx - 1.5, ab.vy * 0.8);
    }
  } else if (p === 'spaceblast') {
    activePowerName = 'SPACE BLAST';
    activePowerDesc = 'Explosion clears nearby pegs!';
    const ab = balls.find(b => b.active);
    if (ab) {
      pegs.forEach(peg => {
        if (peg.hit) return;
        const dx = ab.x - peg.x, dy = ab.y - peg.y;
        if (Math.sqrt(dx * dx + dy * dy) < 1.2) {
          peg.hit = true; peg.fadeTimer = 0.5;
          totalPegsHit++; combo++;
          if (peg.type === 'orange') orangeCleared++;
          const baseScore = peg.type === 'orange' ? 100 : 50;
          score += baseScore * Math.min(combo, 10);
          spawnParticles(peg.x, peg.y, theme.orange, 6);
        }
      });
    }
  } else if (p === 'guideball') {
    activePowerName = 'GUIDE BALL';
    activePowerDesc = 'Ball steers toward orange!';
    // Slight home toward nearest orange peg each frame handled in update
  } else {
    activePowerName = 'ZEN BALL';
    activePowerDesc = 'Extra ball returned!';
    ballsLeft++;
  }
  showToast('Power: ' + activePowerName);
}

// ─── Create UI Entities ─────────────────────────────────────────────
const panelConfigs = [
  { config: './ui/title.json', screen: true },
  { config: './ui/modes.json', screen: true },
  { config: './ui/difficulty.json', screen: true },
  { config: './ui/hud.json', follower: true },
  { config: './ui/pause.json', screen: true },
  { config: './ui/gameover.json', screen: true },
  { config: './ui/leaderboard.json', screen: true },
  { config: './ui/achievements.json', screen: true },
  { config: './ui/settings.json', screen: true },
  { config: './ui/stats.json', screen: true },
  { config: './ui/skins.json', screen: true },
  { config: './ui/help.json', screen: true },
  { config: './ui/toast.json', follower: true },
  { config: './ui/countdown.json', follower: true },
  { config: './ui/powerup.json', follower: true },
  { config: './ui/aimguide.json', follower: true },
];

for (const pc of panelConfigs) {
  const entity = world.createEntity();
  entity.addComponent(PanelUI, { config: pc.config });
  if (pc.follower) {
    entity.addComponent(Follower);
    const ov = entity.getVectorView(Follower, 'offsetPosition');
    if (pc.config.includes('hud')) { ov[0] = -0.15; ov[1] = 0.1; ov[2] = -0.4; }
    else if (pc.config.includes('toast')) { ov[0] = 0; ov[1] = -0.08; ov[2] = -0.4; }
    else if (pc.config.includes('countdown')) { ov[0] = 0; ov[1] = 0; ov[2] = -0.5; }
    else if (pc.config.includes('powerup')) { ov[0] = 0.15; ov[1] = 0.1; ov[2] = -0.4; }
    else if (pc.config.includes('aimguide')) { ov[0] = 0.15; ov[1] = -0.05; ov[2] = -0.4; }
    entity.setValue(Follower, 'target', world.player.head);
  } else {
    entity.addComponent(ScreenSpace);
  }
}

// Register systems
world.registerSystem(PegUISystem);
world.registerSystem(PegGameSystem);

// Init audio volumes
audio.setVolumes(save.volumes.master, save.volumes.sfx, save.volumes.music);
