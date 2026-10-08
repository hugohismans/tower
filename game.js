(() => {
'use strict';

// ---------------------------------------------------------------------------
// Caméra : l'écran est la fenêtre du sniper. Le sol est un plan vu en
// perspective (x vers la droite, y = hauteur, z = profondeur).
// ---------------------------------------------------------------------------
const W = 960, H = 540;
const F = 600, HOR = 150, CAM_X = 380, CAM_H = 140, CX = 480;
const ZN = 300, ZF = 470;                  // couloir où marchent les ennemis
const WALL_X = 470, WZ0 = 282, WZ1 = 488;  // le mur, perpendiculaire au couloir
const BX0 = 512, BX1 = 602, BZ0 = 296, BZ1 = 472, FH = 38, MAX_FLOORS = 5;
const ALLY_Z = 338, DECO_Z = 430;          // fenêtres côté ennemis
const U = 0.52;                            // unités monde par "pixel" de sprite

const P3 = (x, y, z) => { const k = F / z; return { x: CX + (x - CAM_X) * k, y: HOR + (CAM_H - y) * k, k }; };
const groundY = z => HOR + CAM_H * F / z;

const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

function seeded(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; }

// ---------------------------------------------------------------------------
// Styles graphiques
// ---------------------------------------------------------------------------
const DESERT = {
  paper: false, line: '#3a2a20', lw: 2,
  skyDay: ['#4f9fe0', '#a9d8f2', '#f7dfb5'], skySet: ['#c8604a', '#f29a6a', '#fbd29a'], skyNight: ['#0b1230', '#1b2350', '#3b3462'],
  sun: '#ffd75e', mesa: '#c97a4b', mesaShade: '#a85d38', mesaFar: '#d9a07a',
  dune1: '#e9c084', dune2: '#e0ad6a', groundFar: '#e3b677', groundNear: '#f0cd95',
  track: 'rgba(150,95,45,0.20)', rut: 'rgba(120,75,35,0.28)',
  cactus: '#5f9b4a', rock: '#ab8d73', bush: '#7d7a3e',
  bldLeft: '#d7a370', bldFront: '#efcb9b', bldTop: '#c08b5a', bldTrim: '#b37a48',
  window: '#3b2a24', windowFrame: '#7a4b2e', door: '#6e4126', crack: '#5a3a24',
  walls: [
    { face: '#b98552', top: '#d1a06a', front: '#a06c3c', joint: '#7d5230' },
    { face: '#b5523b', top: '#c96c51', front: '#984230', joint: '#e8c9a8' },
    { face: '#a59d92', top: '#c0b8ad', front: '#8c857b', joint: '#6c665e' },
    { face: '#d2ab73', top: '#e2c08a', front: '#b8935b', joint: '#946f40' },
    { face: '#a1a6a9', top: '#bcc0c3', front: '#878c8f', joint: '#777c7f' },
    { face: '#7c8387', top: '#9aa0a4', front: '#666c70', joint: '#4f5457' },
  ],
  stick: '#2b2422', blood: '#b8322a', gold: '#f2b33d', flash: '#fff3b0',
  smoke: [70, 60, 55], dust: [190, 150, 100],
  tank: ['#7b8a45', '#5f6c33', '#4a5428'], horse: '#8b5a2b', horseDark: '#6b4220',
  metal: '#cfd6dd', gun: '#3a3a3a', wood: '#7a4b2e', ally: '#2f6fd6', rocket: '#c0392b', allyRocket: '#556b2f',
  team: { sword: '#d6453d', gunner: '#4f7d3a', rider: '#8e44ad', brute: '#e67e22', bazooka: '#2c82c9', shield: '#5d6d7e', dynamite: '#d23a2a', medic: '#f4f4f4', mortar: '#7d5a2b' },
  mech: '#4a4f57', mechLight: '#737a85', eye: '#ff3b30', walker: '#a39572', walkerDark: '#6b6046',
  worm: '#c9925a', wormDark: '#9c6b3e', wormMouth: '#5a1e1e', heli: '#5f6c33', glass: '#9fd3e6',
  shieldPlate: '#9aa7b3', dyn: '#d23a2a', medic: '#f7f7f2', egg: '#e8873a',
  elite: 'rgba(255,196,40,0.35)', heal: 'rgba(80,200,120,0.22)',
  shadow: 'rgba(70,40,15,0.22)', text: '#3a2a20', textHalo: 'rgba(255,244,224,0.95)', title: '#d9622b',
  tracer: '#ffe08a', hitmark: '#ffffff', mesaLine: 'rgba(58,42,32,0.35)', duneLine: 'rgba(120,80,40,0.25)', trackEdge: 'rgba(120,75,35,0.3)',
  bar: '#5aa83a', barLow: '#d6453d', barBg: 'rgba(255,244,224,0.9)', reticle: '#d6453d', moon: '#f4f1de',
};
const PAPER_BG = '#f4f6f8', INK = '#22409a', INK_DARK = '#172347';
const PAPER = {
  paper: true, line: INK, lw: 1.8, grid: 'rgba(64,104,184,0.11)',
  skyDay: [PAPER_BG, PAPER_BG, PAPER_BG], skySet: [PAPER_BG, PAPER_BG, PAPER_BG], skyNight: [PAPER_BG, PAPER_BG, PAPER_BG],
  sun: '#a86f0b', mesa: PAPER_BG, mesaShade: PAPER_BG, mesaFar: PAPER_BG,
  dune1: PAPER_BG, dune2: PAPER_BG, groundFar: PAPER_BG, groundNear: PAPER_BG,
  track: 'rgba(34,64,154,0.05)', rut: 'rgba(34,64,154,0.25)',
  cactus: PAPER_BG, rock: PAPER_BG, bush: INK,
  bldLeft: PAPER_BG, bldFront: PAPER_BG, bldTop: PAPER_BG, bldTrim: INK,
  window: '#dfe5f2', windowFrame: INK, door: '#dfe5f2', crack: INK_DARK,
  walls: Array.from({ length: 6 }, () => ({ face: PAPER_BG, top: PAPER_BG, front: PAPER_BG, joint: 'rgba(34,64,154,0.35)' })),
  stick: INK_DARK, blood: '#c62f3a', gold: '#a86f0b', flash: '#e8b04a',
  smoke: [34, 64, 154], dust: [34, 64, 154],
  tank: [PAPER_BG, PAPER_BG, PAPER_BG], horse: PAPER_BG, horseDark: INK,
  metal: INK, gun: INK_DARK, wood: INK, ally: INK, rocket: PAPER_BG, allyRocket: PAPER_BG,
  team: null,
  mech: PAPER_BG, mechLight: PAPER_BG, eye: '#c62f3a', walker: PAPER_BG, walkerDark: '#dfe5f2',
  worm: PAPER_BG, wormDark: INK, wormMouth: '#dfe5f2', heli: PAPER_BG, glass: '#dfe5f2',
  shieldPlate: '#dfe5f2', dyn: '#c62f3a', medic: PAPER_BG, egg: '#dfe5f2',
  elite: 'rgba(168,111,11,0.22)', heal: 'rgba(34,154,90,0.15)',
  shadow: 'rgba(34,64,154,0.10)', text: INK_DARK, textHalo: 'rgba(244,246,248,0.95)', title: INK,
  tracer: '#a86f0b', hitmark: INK_DARK, mesaLine: 'rgba(34,64,154,0.35)', duneLine: 'rgba(34,64,154,0.3)', trackEdge: 'rgba(34,64,154,0.35)',
  bar: INK, barLow: '#c62f3a', barBg: 'rgba(253,253,251,0.9)', reticle: '#c62f3a', moon: PAPER_BG,
};
let style = 'desert';
try { if (localStorage.getItem('sniper.style') === 'paper') style = 'paper'; } catch (e) { /* stockage indisponible */ }
let PAL = style === 'paper' ? PAPER : DESERT;
const FONT = () => style === 'paper' ? '"Kalam", "Comic Sans MS", cursive' : '"Fredoka", "Trebuchet MS", sans-serif';
const FONT_D = () => style === 'paper' ? '"Caveat Brush", "Kalam", cursive' : '"Rye", Georgia, serif';

function setStyle(s) {
  style = s; PAL = s === 'paper' ? PAPER : DESERT;
  document.body.classList.toggle('paper', s === 'paper');
  $('styleDesert').setAttribute('aria-pressed', String(s === 'desert'));
  $('stylePaper').setAttribute('aria-pressed', String(s === 'paper'));
  try { localStorage.setItem('sniper.style', s); } catch (e) { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Données de jeu
// ---------------------------------------------------------------------------
const ENEMY = {
  sword:    { name: 'Épéiste',         hp: 40,   speed: 38, melee: true, dmg: 7,  rate: 1.0,  reward: 5,  s: 1,    half: 6 },
  gunner:   { name: 'Mitrailleur',     hp: 65,   speed: 30, range: [80, 170],  dmg: 2.4, pause: 1.7, reward: 9, s: 1, half: 6 },
  rider:    { name: 'Cavalier',        hp: 90,   speed: 95, melee: true, dmg: 12, rate: 0.9,  reward: 13, s: 1,    half: 18 },
  brute:    { name: 'Colosse',         hp: 280,  speed: 19, melee: true, dmg: 30, rate: 0.55, reward: 24, s: 1.45, half: 9 },
  bazooka:  { name: 'Lance-roquettes', hp: 75,   speed: 26, range: [180, 250], dmg: 45, rate: 0.22, reward: 17, s: 1, half: 6 },
  tank:     { name: 'Tank',            hp: 1200, speed: 13, range: [200, 240], dmg: 80, rate: 0.17, reward: 95, s: 1, half: 32, mech: true },
  shield:   { name: 'Bouclier',        hp: 90,   speed: 28, melee: true, dmg: 9,  rate: 0.9,  reward: 12, s: 1,    half: 8 },
  dynamite: { name: 'Dynamiteur',      hp: 45,   speed: 52, melee: true, dmg: 110, rate: 1,   reward: 14, s: 1,    half: 6, plant: 1.4 },
  crawler:  { name: 'Rampant',         hp: 18,   speed: 85, melee: true, dmg: 14, rate: 1,    reward: 3,  s: 1,    half: 4, plant: 0.05, mech: true },
  medic:    { name: 'Médecin',         hp: 60,   speed: 28, range: [200, 260], reward: 15, s: 1, half: 6, heal: 10, healR: 60 },
  drone:    { name: 'Drone',           hp: 50,   speed: 45, fly: 70,  dmg: 18, rate: 0.33, reward: 12, s: 1, half: 0, mech: true },
  arachnid: { name: 'Arachnide',       hp: 350,  speed: 70, range: [160, 230], dmg: 30, rate: 0.2, reward: 45, s: 1, half: 20, mech: true, salvo: 4 },
  mortar:   { name: 'Mortier',         hp: 70,   speed: 24, range: [360, 420], dmg: 35, rate: 0.16, reward: 18, s: 1, half: 6 },
  heli:     { name: 'Hélicoptère',     hp: 600,  speed: 40, fly: 105, dmg: 30, rate: 0.28, reward: 70, s: 1, half: 0, mech: true },
  walker:   { name: 'Marcheur',        hp: 3000, speed: 11, melee: true, dmg: 60, rate: 0.5, reward: 400, s: 1, half: 26, mech: true, boss: true },
  worm:     { name: 'Ver des sables',  hp: 4000, speed: 55, dmg: 50, rate: 0.7, reward: 500, s: 1, half: 0, boss: true },
  queen:    { name: 'Reine arachnide', hp: 6000, speed: 18, range: [220, 260], dmg: 30, rate: 0.17, reward: 700, s: 1, half: 45, mech: true, boss: true, salvo: 6 },
};

const DAY_NEWS = {
  1: 'Des épéistes foncent sur le mur.',
  2: 'Des mitrailleurs arrivent. Ils tirent à distance.',
  4: 'Cavaliers : très rapides.',
  5: 'Colosses : lents, mais très résistants.',
  6: 'Lance-roquettes : ils visent le bâtiment.',
  7: 'Boucliers : le corps est protégé, vise la tête.',
  8: 'Les tanks entrent en scène.',
  9: 'Dynamiteurs : abats-les avant qu\'ils atteignent le mur.',
  11: 'Rampants : des petites araignées mécaniques qui explosent.',
  12: 'Médecins : ils soignent les autres. Cible prioritaire.',
  13: 'Drones : ils survolent le mur. Toi seul peux les abattre.',
  15: 'Arachnides : rapides, elles tirent des salves de missiles.',
  17: 'Mortiers : leurs obus tombent du ciel. Intercepte-les.',
  18: 'Hélicoptères : à toi de les descendre.',
};

const WEAPONS = [
  { name: 'Fusil de sniper', dmg: 45, auto: false, interval: 0.7,  mag: 5,   reload: 1.8, spread: 0,  pierce: 1, cost: 0,    kick: 9, desc: '' },
  { name: 'Sniper lourd',    dmg: 95, auto: false, interval: 0.8,  mag: 6,   reload: 1.8, spread: 0,  pierce: 3, cost: 450,  kick: 12,
    desc: 'Dégâts doublés, la balle traverse 3 ennemis.' },
  { name: "Fusil d'assaut",  dmg: 26, auto: true,  interval: 0.11, mag: 30,  reload: 1.9, spread: 13, pierce: 1, cost: 1100, kick: 2.5,
    desc: 'Tir automatique : garde le doigt appuyé.' },
  { name: 'Minigun',         dmg: 22, auto: true,  interval: 0.04, mag: 200, reload: 3.2, spread: 20, pierce: 1, cost: 2600, kick: 1.6,
    desc: 'Le dernier recours. 25 balles par seconde.' },
];

// Tireurs cachés dans la maison : nombre illimité, prix fixe.
// Chaque type est débloqué par un étage et tire depuis cet étage.
const SQUADS = {
  shooter: { name: 'Tireur', floor: 1, cost: 80, interval: 5, dmg: 25,
             desc: 'Tire une balle toutes les 5 s et touche à chaque fois.' },
  sniper:  { name: 'Sniper', floor: 2, cost: 250, interval: 5, dmg: 80, head: 0.35,
             desc: 'Un tireur bien plus puissant, qui vise souvent la tête.' },
  rocket:  { name: 'Lance-roquettes', floor: 3, cost: 600, interval: 7, dmg: 160, splash: 45,
             desc: 'Une roquette toutes les 7 s, dégâts de zone. Vise les groupes et les tanks.' },
};

const WALL_NAMES = ['Palissade', 'Mur de briques', 'Mur de pierre', 'Rempart', 'Béton', 'Béton armé'];
const wallMax = lvl => 220 + lvl * 240;
const wallH = lvl => 24 + lvl * 4;
const wallT = lvl => 6 + lvl;
const bldMax = f => 320 + (f - 1) * 300;

// ---------------------------------------------------------------------------
// Jeu infini : boss tous les 10 jours (Marcheur, Ver, Reine, puis on recommence
// avec un rang de plus et un module de plus), mutations à partir du jour 31,
// ennemis élites à partir du jour 25, et un plafond d'ennemis par jour.
// ---------------------------------------------------------------------------
const BOSS_CYCLE = ['walker', 'worm', 'queen'];
const BOSS_HINT = {
  walker: 'Casse ses deux jambes, puis vise la cabine.',
  worm: 'Tire quand il sort du sable.',
  queen: 'Vise son œil rouge.',
};
const BOSS_FIRST_MODULE = { walker: 'passenger', worm: 'twin', queen: 'escort' };
const MODULES = {
  passenger: 'arachnide passager', twin: 'un deuxième ver', escort: 'escorte de Marcheur',
  missiles: 'nacelles de missiles', hatch: 'trappe à rampants', shieldgen: 'générateur de bouclier',
  mortar: 'mortier', armor: 'blindage', drones: 'escorte de drones',
};
const MODULE_POOL = ['missiles', 'hatch', 'shieldgen', 'mortar', 'armor', 'drones'];
const MUTATIONS = {
  enraged: { name: 'Enragés', desc: '+30 % de vitesse' },
  armored: { name: 'Blindés', desc: 'les petits tirs font moins mal' },
  regen:   { name: 'Régénération', desc: 'les ennemis se soignent' },
  swarm:   { name: 'Essaim', desc: 'deux fois plus de rampants' },
  sky:     { name: 'Ciel saturé', desc: 'deux fois plus de drones' },
  storm:   { name: 'Tempête de sable', desc: 'le fond du couloir est flou' },
};
const MAX_PER_DAY = 150;

const cycleOf = d => Math.floor((d - 1) / 30) + 1;

function bossFor(d) {
  if (d < 10 || d % 10) return null;
  const n = d / 10 - 1, type = BOSS_CYCLE[n % 3], rank = Math.floor(n / 3) + 1;
  const mods = [];
  if (rank >= 2) mods.push(BOSS_FIRST_MODULE[type]);
  const R = seeded(d * 7919);
  for (let r = 3; r <= rank; r++) {
    const free = MODULE_POOL.filter(m => !mods.includes(m));
    const pool = free.length ? free : MODULE_POOL;
    mods.push(pool[Math.floor(R() * pool.length)]);
  }
  return { type, rank, mods };
}

function mutationsFor(d) {
  const n = Math.max(0, Math.floor((d - 1) / 10) - 2);
  return Array.from({ length: n }, (_, i) => S.mutOrder[i % S.mutOrder.length]);
}
const mut = name => S.muts ? S.muts.filter(m => m === name).length : 0;

function roman(n) {
  if (n <= 1) return '';
  const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of t) while (n >= v) { s += r; n -= v; }
  return ' ' + s;
}
const bossName = e => e.def.name + roman(e.rank);

// ---------------------------------------------------------------------------
// État
// ---------------------------------------------------------------------------
let S = makeState('title');
let best = 0;
try { best = +localStorage.getItem('sniper.best') || 0; } catch (e) { /* ignore */ }

function makeState(mode) {
  return {
    mode, day: 0, money: 0, kills: 0, t: 0,
    wall: { lvl: 0, hp: wallMax(0) }, bld: { floors: 1, hp: bldMax(1) },
    w: { tier: 0, dmg: 0, rate: 0, reload: 0, ammo: WEAPONS[0].mag, reloading: 0, cd: 0 },
    squads: { shooter: [], sniper: [], rocket: [] }, enemies: [], proj: [], fx: [], texts: [], corpses: [],
    queue: [], total: 0, dayT: 0, dayLen: 1, dayKills: 0, dayMoney: 0, endTimer: 0,
    banner: null, shake: 0, kick: 0, dyingT: 0, demoT: 0,
    muts: [], mutOrder: Object.keys(MUTATIONS), eliteChance: 0, hpBoost: 1,
  };
}

function weaponStats() {
  const b = WEAPONS[S.w.tier];
  return { ...b, dmg: b.dmg * (1 + 0.22 * S.w.dmg), interval: b.interval / (1 + 0.12 * S.w.rate), reload: b.reload / (1 + 0.18 * S.w.reload) };
}

const wallAlive = () => S.wall.hp > 0;
const frontX = () => wallAlive() ? WALL_X : BX0;
const bldH = () => S.bld.floors * FH;

// ---------------------------------------------------------------------------
// Déroulement : jours et nuits
// ---------------------------------------------------------------------------
// Mode test : argent illimité et bouton pour passer au jour suivant
function newGame(test) {
  S = makeState('day');
  S.test = !!test;
  S.mutOrder = Object.keys(MUTATIONS).sort(() => Math.random() - 0.5);
  if (S.test) S.money = Infinity;
  $('btnSkip').hidden = !S.test;
  startDay();
}

function skipDay() {
  if (S.mode !== 'day' && S.mode !== 'paused') return;
  $('pause').hidden = true;
  S.queue = []; S.enemies = []; S.proj = [];
  endDay();
}

const moneyText = () => S.money === Infinity ? '∞ $' : `${S.money} $`;

function startDay() {
  S.day++;
  const d = S.day;
  S.muts = mutationsFor(d);
  const boss = bossFor(d);
  const counts = {
    sword: 5 + d * 3,
    gunner: d >= 2 ? 2 + (d - 2) * 2 : 0,
    rider: d >= 4 ? 2 + (d - 4) * 2 : 0,
    brute: d >= 5 ? 1 + Math.floor((d - 5) * 0.7) : 0,
    bazooka: d >= 6 ? 1 + (d - 6) : 0,
    shield: d >= 7 ? 1 + Math.floor((d - 7) * 0.8) : 0,
    tank: d >= 8 ? 1 + Math.floor((d - 8) / 2) : 0,
    dynamite: d >= 9 ? 1 + Math.floor((d - 9) * 0.6) : 0,
    medic: d >= 12 ? 1 + Math.floor((d - 12) * 0.3) : 0,
    drone: d >= 13 ? (1 + Math.floor((d - 13) * 0.6)) * (1 + mut('sky')) : 0,
    arachnid: d >= 15 ? 1 + Math.floor((d - 15) * 0.35) : 0,
    mortar: d >= 17 ? 1 + Math.floor((d - 17) * 0.3) : 0,
    heli: d >= 18 ? 1 + Math.floor((d - 18) * 0.2) : 0,
  };
  let groups = d >= 11 ? 1 + Math.floor((d - 11) * 0.4) : 0;
  const groupSize = 8 * (1 + mut('swarm'));
  if (boss) { for (const k in counts) counts[k] = Math.ceil(counts[k] * 0.5); groups = Math.ceil(groups * 0.5); }
  // Plafond : au-delà, moins d'ennemis mais plus costauds et plus d'élites
  const total = Object.values(counts).reduce((a, b) => a + b, 0) + groups * groupSize;
  const f = Math.min(1, MAX_PER_DAY / total);
  if (f < 1) { for (const k in counts) if (counts[k]) counts[k] = Math.max(1, Math.round(counts[k] * f)); groups = Math.max(1, Math.round(groups * f)); }
  S.hpBoost = 1 / Math.sqrt(f);
  S.eliteChance = d >= 25 ? Math.min(0.45, (d - 24) * 0.012) + (1 - f) * 0.3 : 0;

  const len = Math.min(25 + d * 5, 100);
  const q = [];
  const heavy = { tank: 1, brute: 1, arachnid: 1, heli: 1 };
  for (const [type, c] of Object.entries(counts)) {
    for (let i = 0; i < c; i++) {
      const t = heavy[type] ? len * rand(0.35, 1) : len * Math.pow(Math.random(), 0.85);
      q.push({ type, t: Math.max(0.8, t) });
    }
  }
  for (let i = 0; i < groups; i++) q.push({ type: 'crawlers', n: groupSize, t: len * rand(0.2, 1) });
  if (boss) q.push({ type: boss.type, boss, t: len * 0.15 });
  q.sort((a, b) => a.t - b.t);
  Object.assign(S, {
    mode: 'day', queue: q, total: q.length, dayT: 0, dayLen: len, dayKills: 0, dayMoney: 0, endTimer: 0,
    enemies: [], proj: [], corpses: [],
  });
  S.w.ammo = weaponStats().mag; S.w.reloading = 0; S.w.cd = 0;
  let sub = DAY_NEWS[d] || 'Ils sont toujours plus nombreux.';
  if (boss) {
    const name = ENEMY[boss.type].name + roman(boss.rank);
    sub = `Boss : ${name}. ${BOSS_HINT[boss.type]}`;
    if (boss.mods.length) sub = `Boss : ${name}, avec ${boss.mods.map(m => MODULES[m]).join(', ')}.`;
  } else if (d > 30 && d % 10 === 1) {
    const m = MUTATIONS[S.muts[S.muts.length - 1]];
    sub = `Nouvelle mutation : ${m.name} (${m.desc}).`;
  }
  S.banner = { title: `Jour ${d}`, sub, t: 0 };
  hideAll();
  $('hud').hidden = false; $('weapon').hidden = false;
}

function endDay() {
  S.mode = 'night';
  pointer.down = false;
  const bonus = 40 + S.day * 15;
  S.money += bonus;
  if (!S.test && S.day > best) { best = S.day; try { localStorage.setItem('sniper.best', best); } catch (e) { /* ignore */ } }
  $('shopTitle').textContent = `Nuit ${S.day}`;
  $('shopRecap').textContent = `Jour ${S.day} tenu. ${S.dayKills} ennemis abattus, ${S.dayMoney} $ gagnés, prime de nuit +${bonus} $.`;
  $('btnNext').textContent = `Commencer le jour ${S.day + 1}`;
  renderShop();
  $('shopWrap').hidden = false;
}

function gameOver() {
  S.mode = 'over';
  pointer.down = false;
  const held = S.day - 1, rec = S.test ? best : Math.max(best, held);
  $('overText').textContent = `Tu as tenu ${held} jour${held > 1 ? 's' : ''} et abattu ${S.kills} ennemis. Record : ${rec} jour${rec > 1 ? 's' : ''}.`;
  $('over').hidden = false;
  $('weapon').hidden = true;
}

function toTitle() {
  S = makeState('title');
  hideAll();
  $('hud').hidden = true; $('weapon').hidden = true; $('btnSkip').hidden = true;
  $('title').hidden = false;
  showBest();
}

function hideAll() { for (const id of ['title', 'pause', 'shopWrap', 'over']) $(id).hidden = true; }

// ---------------------------------------------------------------------------
// Ennemis
// ---------------------------------------------------------------------------
const visLeftX = z => CAM_X + (-offX / scale - CX) * z / F;

function spawn(type, demo, o = {}) {
  const def = ENEMY[type];
  const d = Math.max(1, S.day);
  const elite = !demo && !def.boss && !o.noElite && Math.random() < (S.eliteChance || 0);
  let hp = def.hp * (1 + 0.07 * (d - 1)) * (S.hpBoost || 1) * (elite ? 3 : 1);
  if (def.boss) hp *= 1 + 0.6 * ((o.rank || 1) - 1);
  const z = o.z ?? rand(ZN, ZF);
  const e = {
    type, def, z, z0: z, x: o.x ?? visLeftX(z) - rand(25, 60), hp, max: hp,
    cd: rand(0.3, 1), walk: rand(0, 6), flash: 0, muzzle: 0, kb: 0, t: 0, phase: rand(0, 6),
    jit: rand(0, 9), range: def.range ? rand(def.range[0], def.range[1]) : 0, burst: 5, salvo: def.salvo || 0,
    dmgMul: (1 + 0.04 * (d - 1)) * (elite ? 1.5 : 1), demo: demo ? rand(3, 6) : 0,
    elite, rank: o.rank || 1, mods: o.mods || [], alt: def.fly || 0, altOff: rand(-10, 10),
  };
  if (type === 'walker') { e.legMax = hp * 0.3; e.legs = [e.legMax, e.legMax]; }
  if (type === 'worm') { e.state = 'travel'; e.emerge = 0; e.timer = 0; }
  if (type === 'drone') { e.hoverX = rand(BX0 + 10, BX1 - 10); e.tz = rand(BZ0 + 15, BZ1 - 15); }
  S.enemies.push(e);
  return e;
}

function spawnEntry(q) {
  if (q.type === 'crawlers') { const z = rand(ZN + 10, ZF - 10); spawnCrawlers(visLeftX(z) - 30, z, q.n, 60); return; }
  spawn(q.type, false, q.boss || {});
  if (q.boss && q.boss.mods.includes('twin')) spawn('worm', false, { rank: 1 });
  if (q.boss && q.boss.mods.includes('escort')) spawn('walker', false, { rank: 1, x: visLeftX(ZN) - 120 });
}

function spawnCrawlers(x, z, n, spread = 20) {
  for (let i = 0; i < n; i++) spawn('crawler', false, { x: x - rand(0, spread), z: clamp(z + rand(-30, 30), ZN, ZF), noElite: true });
}

// Boîtes touchables, en coordonnées de sprite : [x0, x1, y0, y1, tête x, tête y, rayon]
const BOX = {
  crawler: [-12, 13, -20, 0], arachnid: [-36, 40, -62, 0, 29, -41, 7], queen: [-83, 92, -143, 0, 67, -94, 14],
  drone: [-17, 17, -10, 6], heli: [-62, 36, -20, 12, 18, -1, 9],
};

// Zone touchable à l'écran (corps + tête). null = impossible à toucher (ver sous le sable)
function geom(e) {
  const def = e.def;
  const p = P3(e.x, def.fly ? e.alt : 0, e.z), u = p.k * U * def.s;
  const b = BOX[e.type];
  if (b) return { x0: p.x + b[0] * u, x1: p.x + b[1] * u, y0: p.y + b[2] * u, y1: p.y + b[3] * u, hx: p.x + (b[4] || 0) * u, hy: p.y + (b[5] || 0) * u, hr: (b[6] || 0) * u, u };
  if (e.type === 'tank') {
    const a = P3(e.x - 32, 0, e.z - 14), c = P3(e.x + 46, 0, e.z - 14), t = P3(e.x - 14, 28, e.z + 8);
    return { x0: a.x, x1: c.x, y0: t.y, y1: a.y, hr: 0, u };
  }
  if (e.type === 'walker') {
    const top = e.fallen ? -80 : -157;
    return { x0: p.x - 36 * u, x1: p.x + 40 * u, y0: p.y + top * u, y1: p.y, hr: 0, u };
  }
  if (e.type === 'worm') {
    if (e.emerge < 0.35) return null;
    const h = 140 * e.emerge;
    return { x0: p.x - 26 * u, x1: p.x + 44 * u, y0: p.y - h * u, y1: p.y, hx: p.x + 30 * u, hy: p.y - (h - 10) * u, hr: 16 * u, u };
  }
  if (e.type === 'rider') return { x0: p.x - 30 * u, x1: p.x + 36 * u, y0: p.y - 72 * u, y1: p.y, hx: p.x + 4 * u, hy: p.y - 64 * u, hr: 7 * u, u };
  const crouch = (e.type === 'bazooka' || e.type === 'mortar' || e.type === 'dynamite') && e.attacking ? 9 : 0;
  return { x0: p.x - 11 * u, x1: p.x + 14 * u, y0: p.y - (54 - crouch) * u, y1: p.y, hx: p.x + 5 * u, hy: p.y - (46 - crouch) * u, hr: 7 * u, u };
}

// Cible du Marcheur : jambe arrière, jambe avant ou cabine
function walkerPart(e, px, py) {
  if (e.fallen) return 'cabin';
  const p = P3(e.x, 0, e.z), u = p.k * U;
  if ((py - p.y) / u < -108) return 'cabin';
  const i = (px - p.x) / u < 0 ? 0 : 1;
  return e.legs[i] > 0 ? 'leg' + i : 'cabin';
}

const canBeTargeted = e => !e.dead && !e.demo && !e.def.fly && geom(e) !== null;

const WALK_RATE = { rider: 11, tank: 4, crawler: 16, arachnid: 7, walker: 2.2, queen: 4 };

function updateEnemy(e, dt) {
  const def = e.def;
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.muzzle = Math.max(0, e.muzzle - dt);
  if (e.demo) { e.demo -= dt; if (e.demo <= 0) { kill(e, false, true); return; } }
  const reg = mut('regen');
  if (reg && e.hp > 0) e.hp = Math.min(e.max, e.hp + e.max * 0.02 * reg * dt);
  const speed = def.speed * (1 + 0.3 * mut('enraged'));
  if (def.boss && !e.demo) updateBoss(e, dt);
  if (e.type === 'worm') { updateWorm(e, dt, speed); return; }
  if (def.fly) { updateFlyer(e, dt, speed); return; }
  if (e.kb > 0) { e.x -= e.kb * dt * 60; e.kb = Math.max(0, e.kb - dt * 30); }
  const fx = frontX();
  let stopX = def.melee ? fx - def.half - e.jit : fx - e.range;
  if (!def.melee) stopX = Math.max(stopX, visLeftX(e.z) + 30);
  if (e.fallen) stopX = e.x;
  if (e.x < stopX - 0.5) {
    e.x = Math.min(stopX, e.x + speed * dt);
    if (e.type === 'arachnid') e.z = clamp(e.z0 + Math.sin(e.t * 2.4 + e.phase) * 35, ZN, ZF);
    e.walk += dt * (WALK_RATE[e.type] || 9 + def.speed * 0.05);
    e.attacking = false;
    return;
  }
  if (!e.attacking && def.plant) e.cd = def.plant;
  e.attacking = true;
  if (e.fallen) return;
  e.cd -= dt;
  if (e.cd > 0) return;
  switch (e.type) {
    case 'gunner':
      if (e.burst > 0) {
        e.burst--; e.cd = 0.13; e.muzzle = 0.06;
        shootAtFront(e, 'bullet', def.dmg * e.dmgMul);
      } else { e.burst = 4 + (Math.random() * 3 | 0); e.cd = def.pause; }
      break;
    case 'bazooka':
      e.cd = 1 / def.rate; e.muzzle = 0.18;
      launchRocket(e.x + 8, 19, e.z, def.dmg * e.dmgMul);
      break;
    case 'arachnid':
    case 'queen':
      e.cd = 1 / def.rate; e.muzzle = 0.2;
      salvo(e, def.salvo, def.dmg * e.dmgMul);
      break;
    case 'mortar':
      e.cd = 1 / def.rate; e.muzzle = 0.2;
      mortarShell(e.x + 14, 10, e.z, def.dmg * e.dmgMul);
      break;
    case 'medic':
      e.cd = 1;
      break;
    case 'tank':
      e.cd = 1 / def.rate; e.muzzle = 0.22;
      shootAtFront(e, 'shell', def.dmg * e.dmgMul);
      if (S.mode === 'day') sfx('boom');
      break;
    case 'dynamite':
    case 'crawler': {
      e.detonated = true;
      damageFront(def.dmg * e.dmgMul);
      const p = P3(fx - 2, 8, e.z);
      explode(p.x, p.y, (e.type === 'crawler' ? 10 : 26) * p.k, S.mode === 'day');
      kill(e, false, true);
      break;
    }
    default: {
      e.cd = 1 / def.rate;
      damageFront(def.dmg * e.dmgMul);
      if (e.type === 'walker') S.shake = Math.max(S.shake, 6);
      const p = P3(fx - 1, rand(6, 18), e.z);
      for (let i = 0; i < 4; i++) particle(p.x, p.y, rand(-50, 5) * p.k, rand(-70, -20) * p.k, debrisColor(), 0.45, rand(1.2, 2.4) * p.k, groundY(e.z));
      if (S.mode === 'day') sfx('thud');
    }
  }
}

function launchRocket(x0, y0, z0, dmg, dur = 2.1, delay = 0) {
  S.proj.push({ kind: 'rocket', x0, y0, z0, x1: BX0, y1: rand(6, bldH() - 6), z1: rand(BZ0 + 12, BZ1 - 12), t: -delay, dur, arc: 36, dmg });
  if (S.mode === 'day' && !delay) sfx('launch');
}
function salvo(e, n, dmg) {
  const top = e.type === 'queen' ? 62 : e.type === 'walker' ? 86 : e.type === 'heli' ? e.alt - 4 : 26;
  for (let i = 0; i < n; i++) launchRocket(e.x + 6, top, e.z, dmg, rand(1.9, 2.4), i * 0.2);
  if (S.mode === 'day') sfx('launch');
}
function mortarShell(x0, y0, z0, dmg) {
  S.proj.push({ kind: 'mortar', x0, y0, z0, x1: rand(BX0 + 8, BX1 - 8), y1: bldH(), z1: rand(BZ0 + 10, BZ1 - 10), t: 0, dur: 3, arc: 170, dmg });
  if (S.mode === 'day') sfx('launch');
}

// Modules des boss, canon du Marcheur, ponte de la Reine
function updateBoss(e, dt) {
  e.modT = e.modT || {};
  const tick = (key, period, fn) => {
    if (e.modT[key] === undefined) e.modT[key] = rand(1, period);
    e.modT[key] -= dt;
    if (e.modT[key] <= 0) { e.modT[key] = period; fn(); }
  };
  if (e.type === 'walker') tick('cannon', 4, () => {
    e.muzzle = 0.25;
    S.proj.push({ kind: 'shell', x0: e.x + 34, y0: e.fallen ? 32 : 70, z0: e.z, x1: frontX(), y1: rand(4, 20), z1: clamp(e.z, WZ0 + 4, WZ1 - 4), t: 0, dur: 0.6, arc: 4, dmg: 45 * e.dmgMul });
    if (S.mode === 'day') sfx('boom');
  });
  if (e.type === 'queen' && e.attacking) tick('lay', 4, () => spawnCrawlers(e.x - 30, e.z, 3));
  if (e.type === 'worm' && e.state !== 'out') return;
  for (const m of e.mods) {
    if (m === 'missiles') tick('missiles', 6, () => salvo(e, 3, 30 * e.dmgMul));
    else if (m === 'hatch') tick('hatch', 5, () => spawnCrawlers(e.x, e.z, 2));
    else if (m === 'mortar') tick('mortar', 7, () => mortarShell(e.x, 60, e.z, 40 * e.dmgMul));
    else if (m === 'drones') tick('drones', 9, () => { if (S.enemies.filter(o => o.type === 'drone').length < 6) spawn('drone', false, { x: e.x, z: e.z, noElite: true }); });
  }
}

// Ver des sables : avance sous le sable, sort près du mur, frappe, replonge
function updateWorm(e, dt, speed) {
  const tx = frontX() - 40;
  e.walk += dt * 6;
  if ((e.state === 'travel' || e.state === 'under') && Math.random() < 0.5) {
    const p = P3(e.x, 0, e.z);
    particle(p.x + rand(-20, 20) * p.k * 0.5, p.y, rand(-30, 30), rand(-60, -20), `rgba(${PAL.dust.join(',')},0.6)`, 0.6, rand(1.5, 3) * p.k * 0.5, p.y + 1);
  }
  switch (e.state) {
    case 'travel':
      e.x = Math.min(tx, e.x + speed * dt);
      if (e.x >= tx - 1) e.state = 'rise';
      break;
    case 'under':
      e.timer -= dt;
      e.z += (e.tz - e.z) * Math.min(1, dt * 2);
      e.x += (tx - e.x) * Math.min(1, dt * 2);
      if (e.timer <= 0) e.state = 'rise';
      break;
    case 'rise':
      e.emerge = Math.min(1, e.emerge + dt / 0.6);
      if (e.emerge >= 1) {
        e.state = 'out'; e.timer = 4.5; e.cd = 0.8;
        const p = P3(e.x, 0, e.z);
        for (let i = 0; i < 14; i++) particle(p.x, p.y, rand(-90, 90), rand(-180, -60), `rgba(${PAL.dust.join(',')},0.8)`, 0.8, rand(2, 4), p.y + 2);
      }
      break;
    case 'out':
      e.attacking = true;
      e.timer -= dt; e.cd -= dt;
      if (e.cd <= 0) {
        e.cd = 1 / e.def.rate; e.swing = 0.3;
        damageFront(e.def.dmg * e.dmgMul);
        S.shake = Math.max(S.shake, 5);
        if (S.mode === 'day') sfx('thud');
      }
      if (e.timer <= 0) e.state = 'dive';
      break;
    case 'dive':
      e.attacking = false;
      e.emerge = Math.max(0, e.emerge - dt / 0.6);
      if (e.emerge <= 0) { e.state = 'under'; e.timer = 2.2; e.tz = rand(ZN, ZF); }
      break;
  }
  e.swing = Math.max(0, (e.swing || 0) - dt);
}

// Drones (au-dessus du toit, lâchent des bombes) et hélicoptères (tirent des roquettes)
function updateFlyer(e, dt, speed) {
  const def = e.def;
  e.walk += dt * 30;
  const tx = e.type === 'drone' ? e.hoverX : WALL_X - 110 - e.jit * 6;
  if (e.x < tx - 0.5) { e.x = Math.min(tx, e.x + speed * dt); e.attacking = false; }
  else e.attacking = true;
  if (e.type === 'drone' && e.x > WALL_X - 60) e.z += (e.tz - e.z) * Math.min(1, dt * 1.5);
  const base = e.type === 'drone' ? Math.max(def.fly, bldH() + 24) : def.fly;
  e.alt = base + e.altOff + Math.sin(e.t * 2 + e.phase) * 3;
  if (!e.attacking) return;
  e.cd -= dt;
  if (e.cd > 0) return;
  e.cd = 1 / def.rate;
  if (e.type === 'drone') S.proj.push({ kind: 'bomb', x0: e.x, y0: e.alt - 4, z0: e.z, x1: e.x, y1: bldH(), z1: e.z, t: 0, dur: 0.5, arc: 0, dmg: def.dmg * e.dmgMul });
  else { e.muzzle = 0.15; launchRocket(e.x + 20, e.alt - 6, e.z, def.dmg * e.dmgMul, 1.4); }
}

// Soins des médecins (pas sur les boss)
function updateMedics(dt) {
  for (const m of S.enemies) {
    if (m.type !== 'medic' || m.dead || m.demo) continue;
    for (const o of S.enemies) {
      if (o === m || o.dead || o.def.boss || o.hp >= o.max) continue;
      if (Math.hypot(o.x - m.x, o.z - m.z) < m.def.healR) o.hp = Math.min(o.max, o.hp + Math.max(m.def.heal, o.max * 0.04) * dt);
    }
  }
}

function debrisColor() { return wallAlive() ? PAL.walls[S.wall.lvl].face : PAL.bldLeft; }

function shootAtFront(e, kind, dmg) {
  const fx = frontX();
  const x0 = e.type === 'tank' ? e.x + 46 : e.x + 12;
  const y0 = e.type === 'tank' ? 24 : 16;
  const y1 = wallAlive() ? rand(3, wallH(S.wall.lvl) - 2) : rand(4, bldH() - 4);
  const z1 = clamp(e.z + rand(-10, 10), wallAlive() ? WZ0 + 4 : BZ0 + 4, wallAlive() ? WZ1 - 4 : BZ1 - 4);
  const dist = Math.hypot(fx - x0, y1 - y0, z1 - e.z);
  S.proj.push({ kind, x0, y0, z0: e.z, x1: fx, y1, z1, t: 0, dur: dist / (kind === 'shell' ? 380 : 520), arc: kind === 'shell' ? 4 : 0, dmg });
}

function damageFront(d) {
  if (S.mode !== 'day') return;
  if (wallAlive()) {
    S.wall.hp -= d;
    if (S.wall.hp <= 0) {
      S.wall.hp = 0;
      for (let i = 0; i < 30; i++) {
        const z = rand(WZ0, WZ1), p = P3(WALL_X, rand(0, wallH(S.wall.lvl)), z);
        particle(p.x, p.y, rand(-80, 80), rand(-160, -40), PAL.walls[S.wall.lvl].face, 1.2, rand(2, 4), groundY(z));
      }
      const p = P3(WALL_X, 50, (WZ0 + WZ1) / 2);
      floatText(p.x, p.y, 'Le mur est tombé !', PAL.blood, 22);
      S.shake = 9;
      sfx('boom');
    }
  } else damageBld(d);
}

function damageBld(d) {
  if (S.mode !== 'day') return;
  S.bld.hp -= d;
  S.shake = Math.max(S.shake, Math.min(10, d / 6));
  if (S.bld.hp <= 0) { S.bld.hp = 0; S.mode = 'dying'; S.dyingT = 0; pointer.down = false; }
}

// Dégâts de zone (roquettes alliées, explosions) : pas sur les volants
function splashAt(x, z, r, dmg) {
  for (const e of S.enemies) {
    if (e.dead || e.def.fly) continue;
    const g = geom(e);
    if (!g) continue;
    const d = Math.hypot(e.x - x, (e.z - z) * 0.6);
    if (d < r + e.def.half) hit(e, dmg * (1 - Math.min(1, d / (r * 1.6))), false, (g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2, true);
  }
}

function shieldedByBoss(e) {
  return S.enemies.some(b => b !== e && !b.dead && b.mods.includes('shieldgen') && Math.hypot(b.x - e.x, b.z - e.z) < 90);
}

let lastBlockText = 0;
function hit(e, dmg, head, px, py, splash, part) {
  if (e.dead) return;
  if (e.type === 'worm' && e.emerge < 0.35) return;
  const def = e.def;
  if (e.type === 'shield' && !head && !splash) {
    dmg *= 0.15;
    if (S.t - lastBlockText > 0.6) { floatText(px, py - 10, 'Bloqué', PAL.text, 14); lastBlockText = S.t; }
  }
  const armor = e.mods.filter(m => m === 'armor').length;
  if (armor) dmg *= Math.pow(0.7, armor);
  if (shieldedByBoss(e)) dmg *= 0.5;
  const ac = mut('armored');
  if (ac) dmg = Math.max(dmg * 0.25, dmg - 6 * ac);
  e.flash = 0.12;
  const k = F / e.z, gy = def.fly ? 9999 : groundY(e.z);
  const col = def.mech ? PAL.metal : e.type === 'worm' ? PAL.wormDark : PAL.blood;
  for (let i = 0; i < (head ? 10 : 5); i++) particle(px, py, rand(-120, -10) * k * 0.6, rand(-110, 20) * k * 0.6, col, 0.55, rand(1, 2.2) * k, gy);
  if (!def.mech && !def.boss && !def.fly) e.kb = Math.min(3, e.kb + (head ? 2 : 1));

  if (e.type === 'walker') {
    if (!part) part = e.fallen ? 'cabin' : e.legs[0] > 0 && (e.legs[1] <= 0 || Math.random() < 0.5) ? 'leg0' : e.legs[1] > 0 ? 'leg1' : 'cabin';
    if (part !== 'cabin') {
      const i = +part[3];
      e.legs[i] -= dmg;
      if (e.legs[i] <= 0) {
        e.legs[i] = 0;
        const p = P3(e.x + (i ? 12 : -14), 50, e.z);
        explode(p.x, p.y, 24 * p.k * 0.6, true);
        floatText(p.x, p.y - 20, 'Jambe cassée !', PAL.gold, 18);
        if (e.legs[0] <= 0 && e.legs[1] <= 0) {
          e.fallen = true; e.attacking = false; S.shake = 12;
          floatText(p.x, p.y - 50, 'À terre ! Vise la cabine', PAL.blood, 20);
        }
      }
      return;
    }
    if (!e.fallen) {
      dmg *= 0.3;
      if (!splash && S.t - lastBlockText > 0.6) { floatText(px, py - 10, 'Blindé', PAL.text, 14); lastBlockText = S.t; }
    }
  }
  e.hp -= dmg;
  if (head) floatText(px, py - 14, def.mech ? 'Œil !' : e.type === 'worm' ? 'Gueule !' : 'Tête !', PAL.blood, 17);
  if (e.hp <= 0) kill(e, head);
}

function kill(e, head, silent) {
  if (e.dead) return;
  e.dead = true;
  const def = e.def;
  if (!silent) {
    S.kills++; S.dayKills++;
    const g = geom(e) || { x0: P3(e.x, 0, e.z).x, x1: P3(e.x, 0, e.z).x, y0: P3(e.x, 40, e.z).y };
    const base = def.reward * (def.boss ? e.rank : 1) * (e.elite ? 4 : 1);
    reward(Math.round(base) + (head ? 2 : 0), (g.x0 + g.x1) / 2, g.y0 - 6, e.elite ? 'Élite' : def.boss ? bossName(e) : null);
  }
  S.corpses.push({ ...e, t: 0, alt0: e.alt, emerge0: e.emerge || 0 });
  const p = P3(e.x, def.fly ? e.alt : 15, e.z);
  if (e.demo) return;
  switch (e.type) {
    case 'tank': explode(p.x, p.y, 30 * p.k, true); break;
    case 'dynamite':
      if (!e.detonated) { explode(p.x, p.y, 28 * p.k, true); splashAt(e.x, e.z, 45, 90); floatText(p.x, p.y - 30, 'Boum !', PAL.gold, 18); }
      break;
    case 'crawler': if (!e.detonated) explode(p.x, p.y, 8 * p.k, false); break;
    case 'arachnid':
      explode(p.x, p.y, 34 * p.k, true);
      splashAt(e.x, e.z, 50, 100);
      spawnCrawlers(e.x, e.z, 3, 10);
      break;
    case 'drone': case 'heli': explode(p.x, p.y, (e.type === 'heli' ? 30 : 12) * p.k, true); break;
    case 'walker': case 'worm': case 'queen':
      for (let i = 0; i < 6; i++) { const q = P3(e.x + rand(-30, 30), rand(10, 80), e.z + rand(-20, 20)); explode(q.x, q.y, rand(25, 50) * q.k * 0.6, true); }
      S.shake = 14;
      if (e.type === 'queen') spawnCrawlers(e.x, e.z, 5, 30);
      if (e.mods.includes('passenger')) {
        spawn('arachnid', false, { x: e.x + 10, z: e.z, noElite: true });
        floatText(p.x, p.y - 60, "L'arachnide s'échappe !", PAL.blood, 20);
      }
      break;
  }
}

function reward(n, x, y, label) {
  S.money += n; S.dayMoney += n;
  floatText(x, y, label ? `${label} +${n} $` : `+${n} $`, PAL.gold, 16);
}

// ---------------------------------------------------------------------------
// Joueur : on tire depuis la fenêtre, la balle arrive là où on touche
// ---------------------------------------------------------------------------
function startReload() {
  const w = S.w;
  if (w.reloading > 0 || w.ammo >= weaponStats().mag) return;
  w.reloading = weaponStats().reload;
  sfx('reload');
}

function fire(px, py) {
  const w = S.w, ws = weaponStats();
  if (w.reloading > 0 || w.cd > 0) return;
  if (w.ammo <= 0) { startReload(); return; }
  if (ws.spread) { px += rand(-ws.spread, ws.spread); py += rand(-ws.spread, ws.spread) * 0.7; }
  w.ammo--; w.cd = ws.interval;
  S.kick = Math.min(14, S.kick + ws.kick);
  sfx(ws.auto ? 'auto' : 'shot');
  S.fx.push({ kind: 'ring', x: px, y: py, t: 0, life: ws.auto ? 0.12 : 0.3, r: ws.auto ? 6 : 14 });

  for (const p of S.proj) {
    if ((p.kind !== 'rocket' && p.kind !== 'mortar') || p.dead || p.t < 0) continue;
    const q = projPos(p);
    if (Math.hypot(q.x - px, q.y - py) < (ws.auto ? 16 : 26)) {
      p.dead = true;
      explode(q.x, q.y, 22 * q.k * 0.6, false);
      reward(4, q.x, q.y - 14, 'Interceptée');
      if (w.ammo <= 0) startReload();
      return;
    }
  }

  const pad = ws.auto ? 2 : 8;
  const hits = [];
  for (const e of S.enemies) {
    if (e.dead) continue;
    const g = geom(e);
    if (!g) continue;
    const head = g.hr > 0 && Math.hypot(px - g.hx, py - g.hy) <= g.hr + (ws.auto ? 1 : 4);
    if (head || (px >= g.x0 - pad && px <= g.x1 + pad && py >= g.y0 - pad && py <= g.y1 + pad)) {
      const part = e.type === 'walker' ? walkerPart(e, px, py) : undefined;
      hits.push({ e, head: head || (part === 'cabin' && e.fallen), part });
    }
  }
  hits.sort((a, b) => a.e.z - b.e.z);
  const n = Math.min(ws.pierce, hits.length);
  for (let i = 0; i < n; i++) hit(hits[i].e, ws.dmg * (hits[i].head ? 2.5 : 1), hits[i].head, px, py, false, hits[i].part);
  if (n) S.fx.push({ kind: 'hitmark', x: px, y: py, t: 0, life: 0.18 });
  else if (py > HOR + 4) {
    const k = (py - HOR) / CAM_H;
    for (let i = 0; i < (ws.auto ? 2 : 6); i++) particle(px, py, rand(-40, 40) * k, rand(-90, -30) * k, `rgba(${PAL.dust.join(',')},0.7)`, 0.5, rand(1, 2) * k, py + 1);
  }
  if (w.ammo <= 0) startReload();
}

// ---------------------------------------------------------------------------
// Tireurs cachés : on voit l'éclair à la fenêtre de leur étage, pas le tireur
// ---------------------------------------------------------------------------
let lastSquadSfx = 0;
function windowAt(floor) {
  return P3(BX0 - 1, floor * FH + 18, Math.random() < 0.5 ? ALLY_Z : DECO_Z);
}

function updateSquads(dt) {
  const targets = S.enemies.filter(e => canBeTargeted(e) && e.x > visLeftX(e.z) + 5);
  for (const [type, def] of Object.entries(SQUADS)) {
    const cds = S.squads[type];
    for (let i = 0; i < cds.length; i++) {
      cds[i] -= dt;
      if (cds[i] > 0) continue;
      if (!targets.length) { cds[i] = 0.3; continue; }
      cds[i] = def.interval;
      squadShot(type, def);
    }
  }

  function squadShot(type, def) {
    const live = targets.filter(e => !e.dead && geom(e));
    if (!live.length) return;
    const m = windowAt(def.floor - 1);
    if (type === 'rocket') {
      // Vise l'ennemi qui a le plus de voisins (ou un gros morceau comme un tank)
      let best = null, score = -1;
      for (const e of live) {
        let sc = e.hp / 400;
        for (const o of live) if (Math.hypot(o.x - e.x, (o.z - e.z) * 0.6) < def.splash) sc++;
        if (sc > score) { score = sc; best = e; }
      }
      const tx = best.x + (best.attacking || best.def.boss ? 0 : best.def.speed * 0.5);
      const y0 = (def.floor - 1) * FH + 18, dist = Math.hypot(tx - BX0, y0, best.z - ALLY_Z);
      S.proj.push({ kind: 'ally', x0: BX0 - 4, y0, z0: ALLY_Z, x1: tx, y1: 0, z1: best.z, t: 0, dur: dist / 330, arc: 18, dmg: def.dmg, splash: def.splash });
      S.fx.push({ kind: 'flash', x: m.x, y: m.y, t: 0, life: 0.15, r: 5 * m.k * 0.6 });
      sfx('launch');
      return;
    }
    const e = live[Math.random() * live.length | 0];
    const g = geom(e);
    const head = type === 'sniper' && g.hr > 0 && Math.random() < def.head;
    const tx = head ? g.hx : rand(g.x0 + (g.x1 - g.x0) * 0.25, g.x1 - (g.x1 - g.x0) * 0.25);
    const ty = head ? g.hy : rand(g.y0 + (g.y1 - g.y0) * 0.2, g.y1 - (g.y1 - g.y0) * 0.3);
    S.fx.push({ kind: 'flash', x: m.x, y: m.y, t: 0, life: 0.08, r: (type === 'sniper' ? 3.6 : 2.6) * m.k * 0.6 });
    tracer(m.x, m.y, tx, ty, type === 'sniper' ? 0.14 : 0.07, type === 'sniper' ? 1.8 : 1.1);
    hit(e, def.dmg * (head ? 2.5 : 1), head, tx, ty);
    if (S.t - lastSquadSfx > 0.12) { sfx('ally'); lastSquadSfx = S.t; }
  }
}

// ---------------------------------------------------------------------------
// Projectiles et effets
// ---------------------------------------------------------------------------
function projPos(p) {
  const t = clamp(p.t / p.dur, 0, 1);
  const s = P3(lerp(p.x0, p.x1, t), lerp(p.y0, p.y1, t) + p.arc * Math.sin(t * Math.PI), lerp(p.z0, p.z1, t));
  s.t = t;
  return s;
}

function updateProj(p, dt) {
  p.t += dt;
  if (p.t < 0) return;
  if (p.kind === 'rocket' || p.kind === 'ally' || p.kind === 'mortar') {
    const q = projPos(p);
    if (Math.random() < 0.8) particle(q.x, q.y, rand(-10, 10), rand(-25, -5), `rgba(${PAL.smoke.join(',')},0.35)`, 0.7, rand(2, 4) * q.k * 0.6, 9999, -10);
  }
  if (p.t < p.dur) return;
  p.dead = true;
  const q = projPos(p);
  if (p.kind === 'bullet') {
    damageFront(p.dmg);
    particle(q.x, q.y, rand(-60, -10), rand(-60, 10), debrisColor(), 0.3, 1.5, groundY(p.z1));
  } else if (p.kind === 'rocket') {
    explode(q.x, q.y, 20 * q.k, S.mode === 'day');
    damageBld(p.dmg);
  } else if (p.kind === 'shell') {
    explode(q.x, q.y, 22 * q.k, S.mode === 'day');
    damageFront(p.dmg);
  } else if (p.kind === 'mortar' || p.kind === 'bomb') {
    explode(q.x, q.y, (p.kind === 'bomb' ? 10 : 20) * q.k, S.mode === 'day');
    damageBld(p.dmg);
  } else if (p.kind === 'ally') {
    explode(q.x, q.y, p.splash * 0.5 * q.k, true);
    splashAt(p.x1, p.z1, p.splash, p.dmg);
  }
}

let lastBoom = 0;
function explode(x, y, r, loud) {
  S.fx.push({ kind: 'boom', x, y, r, t: 0, life: 0.5 });
  for (let i = 0; i < 6 + r / 3; i++) particle(x, y, rand(-r * 3, r * 3), rand(-r * 4, -r * 0.5), `rgba(${PAL.smoke.join(',')},0.45)`, rand(0.5, 1), rand(0.15, 0.3) * r, 9999, -60);
  if (loud && S.t - lastBoom > 0.08) { sfx('boom'); lastBoom = S.t; }
}

function particle(x, y, vx, vy, color, life, r = 2, floor = 9999, g = 420) {
  S.fx.push({ kind: 'p', x, y, vx, vy, color, t: 0, life, r, floor, g });
}
function tracer(x1, y1, x2, y2, life, w) { S.fx.push({ kind: 'tracer', x1, y1, x2, y2, t: 0, life, w }); }
function floatText(x, y, txt, color, size) { S.texts.push({ x, y, txt, color, size, t: 0, life: 1.1 }); }

function updateFx(dt) {
  for (const f of S.fx) {
    f.t += dt;
    if (f.kind === 'p') {
      f.vy += f.g * dt; f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.y > f.floor) { f.y = f.floor; f.vx *= 0.4; f.vy *= -0.15; }
    }
  }
  S.fx = S.fx.filter(f => f.t < f.life);
  for (const t of S.texts) { t.t += dt; t.y -= 26 * dt; }
  S.texts = S.texts.filter(t => t.t < t.life);
  for (const c of S.corpses) {
    c.t += dt;
    if (c.def.fly && !c.landed) {
      c.alt = Math.max(0, c.alt0 - 160 * c.t * c.t);
      if (c.alt <= 0) { c.landed = true; const p = P3(c.x, 0, c.z); explode(p.x, p.y, (c.type === 'heli' ? 30 : 12) * p.k, true); }
    }
  }
  S.corpses = S.corpses.filter(c => c.t < (c.def.boss ? 8 : c.type === 'tank' ? 7 : 4));
  S.shake = Math.max(0, S.shake - dt * 25);
  S.kick = Math.max(0, S.kick - dt * 70);
  if (S.banner) { S.banner.t += dt; if (S.banner.t > 3.4) S.banner = null; }
}

// ---------------------------------------------------------------------------
// Boucle
// ---------------------------------------------------------------------------
function update(dt) {
  S.t += dt;
  updateFx(dt);

  if (S.mode === 'title') {
    // Démo derrière le menu : quelques ennemis courent vers le mur
    S.demoT -= dt;
    if (S.demoT <= 0 && S.enemies.length < 7) { spawn(['sword', 'sword', 'gunner', 'rider', 'shield', 'crawler', 'arachnid'][Math.random() * 7 | 0], true); S.demoT = rand(0.8, 1.8); }
    for (const e of S.enemies) if (!e.dead) updateEnemy(e, dt);
    for (const p of S.proj) if (!p.dead) updateProj(p, dt);
    S.enemies = S.enemies.filter(e => !e.dead);
    S.proj = S.proj.filter(p => !p.dead);
    return;
  }
  if (S.mode === 'dying') {
    S.dyingT += dt;
    if (Math.random() < 0.35) { const p = P3(rand(BX0, BX1), rand(0, bldH()), rand(BZ0, BZ1)); explode(p.x, p.y, rand(20, 45), true); }
    S.shake = 6;
    if (S.dyingT > 1.8) gameOver();
    return;
  }
  if (S.mode !== 'day') return;

  S.dayT += dt;
  while (S.queue.length && S.queue[0].t <= S.dayT) spawnEntry(S.queue.shift());

  const w = S.w, ws = weaponStats();
  w.cd = Math.max(0, w.cd - dt);
  if (w.reloading > 0) { w.reloading -= dt; if (w.reloading <= 0) { w.reloading = 0; w.ammo = ws.mag; } }
  if (ws.auto && pointer.down && w.cd <= 0) fire(pointer.x, pointer.y);

  for (const e of S.enemies) if (!e.dead) updateEnemy(e, dt);
  updateMedics(dt);
  updateSquads(dt);
  for (const p of S.proj) if (!p.dead) updateProj(p, dt);
  S.enemies = S.enemies.filter(e => !e.dead);
  S.proj = S.proj.filter(p => !p.dead);

  if (S.bld.hp < bldMax(S.bld.floors) * 0.4 && Math.random() < 0.15) {
    const p = P3(rand(BX0 + 10, BX1 - 10), bldH(), rand(BZ0 + 10, BZ1 - 10));
    particle(p.x, p.y, rand(-8, 8), rand(-40, -20), `rgba(${PAL.smoke.join(',')},0.3)`, 1.6, rand(4, 8), 9999, -10);
  }

  if (!S.queue.length && !S.enemies.length && S.mode === 'day') {
    S.endTimer += dt;
    if (S.endTimer > 1.5) { S.proj = []; endDay(); }
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (S.mode !== 'paused') update(dt);
  render();
  updateHud();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------
let scale = 1, offX = 0, offY = 0, dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  scale = Math.min(cw / W, ch / H);
  offX = (cw - W * scale) / 2; offY = (ch - H * scale) / 2;
}

const R = seeded(11);
const MESAS = Array.from({ length: 7 }, (_, i) => ({ x: -200 + i * 230 + R() * 90, w: 90 + R() * 150, h: 18 + R() * 34, far: R() < 0.5 }));
const DUNES = Array.from({ length: 10 }, (_, i) => ({ x: -250 + i * 160 + R() * 60, w: 260 + R() * 120, h: 10 + R() * 18 }));
const PROPS = [];
for (let i = 0; i < 30; i++) {
  const far = R() < 0.6;
  const z = far ? 500 + R() * 600 : 225 + R() * 55;
  const x = far ? -350 + R() * 1100 : -150 + R() * 560;
  const kind = R() < 0.35 ? 'cactus' : R() < 0.6 ? 'rock' : 'bush';
  if (!far && x > WALL_X - 30) continue;
  if (far && z < 560 && x > WALL_X - 20 && x < BX1 + 20) continue;
  PROPS.push({ x, z, kind, s: 0.7 + R() * 0.7, seed: R() });
}
PROPS.sort((a, b) => b.z - a.z);
const WALL_DMG = Array.from({ length: 12 }, () => 0.2 + R() * 0.8);
const CRACKS = Array.from({ length: MAX_FLOORS * 2 }, () => {
  const pts = []; let z = BZ0 + 20 + R() * (BZ1 - BZ0 - 40), y = 4 + R() * 10;
  for (let k = 0; k < 4; k++) { pts.push([z, y]); z += (R() - 0.5) * 30; y += 4 + R() * 7; }
  return pts;
});

function render() {
  const cw = canvas.width, ch = canvas.height;
  const sh = S.shake;
  const jx = rand(-sh, sh), jy = rand(-sh, sh) - S.kick;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (offX + jx * scale), dpr * (offY + jy * scale));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const L = -offX / scale - 30, Rr = (cw / dpr - offX) / scale + 30, T = -offY / scale - 30, B = (ch / dpr - offY) / scale + 30;

  drawSky(L, Rr, T);
  drawGround(L, Rr, B);
  for (const p of PROPS) if (p.z > ZF) drawProp(p);
  drawBuilding();
  drawWall();
  const actors = [...S.corpses.map(c => ({ c, z: c.z + 0.5 })), ...S.enemies.map(e => ({ e, z: e.z }))].sort((a, b) => b.z - a.z);
  for (const a of actors) a.e ? drawEnemy(a.e) : drawCorpse(a.c);
  for (const p of PROPS) if (p.z <= ZF) drawProp(p);
  drawStorm(L, Rr);
  drawProjectiles();
  drawFx();
  drawTexts();
  if (S.mode === 'night') { ctx.fillStyle = 'rgba(10,14,40,0.35)'; ctx.fillRect(L, T, Rr - L, B - T); }
  drawVignette(L, Rr, T, B);
  drawBossBar();
  drawBanner();
  drawReticle();
}

const dayProgress = () => S.mode === 'title' ? 0.3 : clamp(S.dayT / S.dayLen, 0, 1);
function skyColors() {
  if (S.mode === 'night') return PAL.skyNight;
  const t = clamp((dayProgress() - 0.6) / 0.4, 0, 1);
  return PAL.skyDay.map((c, i) => t > 0 ? mix(c, PAL.skySet[i], t) : c);
}

function drawSky(L, Rr, T) {
  const c = skyColors();
  if (PAL.paper) {
    ctx.fillStyle = PAPER_BG; ctx.fillRect(L, T, Rr - L, H - T + 200);
  } else {
    const g = ctx.createLinearGradient(0, T, 0, HOR + 10);
    g.addColorStop(0, c[0]); g.addColorStop(0.6, c[1]); g.addColorStop(1, c[2]);
    ctx.fillStyle = g; ctx.fillRect(L, T, Rr - L, HOR + 10 - T);
  }
  if (S.mode === 'night') {
    ctx.fillStyle = PAL.moon; ctx.strokeStyle = PAL.line; ctx.lineWidth = PAL.lw;
    ctx.beginPath(); ctx.arc(780, 60, 16, 0, Math.PI * 2); ctx.fill();
    if (PAL.paper) ctx.stroke(); else { ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(788, 54, 14, 0, Math.PI * 2); ctx.fill(); }
  } else {
    const p = dayProgress();
    const sx = lerp(80, 880, p), sy = HOR - 22 - Math.sin(p * Math.PI) * 100;
    if (!PAL.paper) {
      const g = ctx.createRadialGradient(sx, sy, 6, sx, sy, 60);
      g.addColorStop(0, 'rgba(255,240,180,0.7)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 60, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p > 0.75 ? mix(PAL.sun, '#ff8a4a', (p - 0.75) * 4) : PAL.sun;
      ctx.beginPath(); ctx.arc(sx, sy, 17, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = PAL.sun; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, 15, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; ctx.moveTo(sx + Math.cos(a) * 21, sy + Math.sin(a) * 21); ctx.lineTo(sx + Math.cos(a) * 28, sy + Math.sin(a) * 28); }
      ctx.stroke();
    }
  }
  // Mesas à l'horizon
  ctx.lineWidth = PAL.lw * 0.8; ctx.strokeStyle = PAL.mesaLine;
  for (const m of MESAS) {
    const base = HOR + 2, top = base - m.h * (m.far ? 0.7 : 1);
    ctx.fillStyle = m.far ? PAL.mesaFar : PAL.mesa;
    ctx.beginPath();
    ctx.moveTo(m.x - m.w / 2, base); ctx.lineTo(m.x - m.w / 2 + 12, top + 4); ctx.lineTo(m.x - m.w / 2 + 20, top);
    ctx.lineTo(m.x + m.w / 2 - 18, top); ctx.lineTo(m.x + m.w / 2 - 8, top + 6); ctx.lineTo(m.x + m.w / 2, base);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (!PAL.paper) {
      ctx.fillStyle = PAL.mesaShade;
      ctx.beginPath(); ctx.moveTo(m.x + m.w / 2 - 18, top); ctx.lineTo(m.x + m.w / 2 - 8, top + 6); ctx.lineTo(m.x + m.w / 2, base); ctx.lineTo(m.x + m.w / 2 - 26, base); ctx.closePath(); ctx.fill();
    }
  }
  if (PAL.paper) {
    ctx.strokeStyle = PAL.grid; ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = Math.floor(L / 24) * 24; x < Rr; x += 24) { ctx.moveTo(x, T); ctx.lineTo(x, H + 100); }
    for (let y = Math.floor(T / 24) * 24; y < H + 100; y += 24) { ctx.moveTo(L, y); ctx.lineTo(Rr, y); }
    ctx.stroke();
  }
}

function drawGround(L, Rr, B) {
  if (!PAL.paper) {
    const g = ctx.createLinearGradient(0, HOR, 0, B);
    g.addColorStop(0, PAL.groundFar); g.addColorStop(1, PAL.groundNear);
    ctx.fillStyle = g; ctx.fillRect(L, HOR, Rr - L, B - HOR);
  }
  ctx.strokeStyle = PAL.line; ctx.lineWidth = PAL.lw;
  ctx.beginPath(); ctx.moveTo(L, HOR + 2); ctx.lineTo(Rr, HOR + 2); ctx.stroke();
  // Dunes
  for (const [layer, col] of [[0, PAL.dune1], [1, PAL.dune2]]) {
    const base = HOR + 22 + layer * 26;
    ctx.fillStyle = col; ctx.strokeStyle = PAL.duneLine; ctx.lineWidth = 1.4;
    for (const d of DUNES) {
      const x = d.x + layer * 70;
      ctx.beginPath(); ctx.moveTo(x - d.w / 2, base); ctx.quadraticCurveTo(x - d.w * 0.1, base - d.h * (1 + layer * 0.4), x + d.w / 2, base);
      if (!PAL.paper) { ctx.closePath(); ctx.fill(); }
      ctx.stroke();
    }
  }
  // Couloir d'arrivée : la bande le long du bâtiment
  const a = P3(-900, 0, ZF + 14), b = P3(WALL_X + 30, 0, ZF + 14), c = P3(WALL_X + 30, 0, ZN - 14), d = P3(-900, 0, ZN - 14);
  ctx.fillStyle = PAL.track;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = PAL.rut; ctx.lineWidth = 1.3; ctx.setLineDash([10, 9]);
  ctx.beginPath();
  for (const z of [ZN + 20, (ZN + ZF) / 2, ZF - 25]) { const p = P3(-900, 0, z), q = P3(WALL_X, 0, z); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); }
  ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = PAL.trackEdge; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(d.x, d.y); ctx.lineTo(c.x, c.y); ctx.stroke();
}

function drawProp(p) {
  const g = P3(p.x, 0, p.z), k = g.k * p.s * 0.55;
  ctx.lineWidth = Math.max(1, PAL.lw * Math.min(1, k)); ctx.strokeStyle = PAL.line;
  if (p.kind === 'cactus') {
    ctx.fillStyle = PAL.cactus;
    const w = 6 * k, h = 30 * k;
    ctx.beginPath(); ctx.roundRect(g.x - w / 2, g.y - h, w, h, w / 2); ctx.fill(); ctx.stroke();
    const arm = (side, y0, len) => {
      const ax = side > 0 ? g.x + w / 2 + 3 * k : g.x - w / 2 - 7 * k;
      ctx.beginPath(); ctx.roundRect(side > 0 ? g.x + w / 2 - 1 : ax, g.y - y0 - 2 * k, 5 * k, 4 * k, 2 * k); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(ax, g.y - y0 - len, 4.5 * k, len + 2 * k, 2.2 * k); ctx.fill(); ctx.stroke();
    };
    arm(1, h * 0.5, 10 * k);
    if (p.seed > 0.4) arm(-1, h * 0.38, 8 * k);
  } else if (p.kind === 'rock') {
    ctx.fillStyle = PAL.rock;
    ctx.beginPath(); ctx.moveTo(g.x - 10 * k, g.y); ctx.lineTo(g.x - 7 * k, g.y - 6 * k); ctx.lineTo(g.x - 1 * k, g.y - 9 * k); ctx.lineTo(g.x + 7 * k, g.y - 6 * k); ctx.lineTo(g.x + 10 * k, g.y); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    ctx.strokeStyle = PAL.bush; ctx.lineWidth = Math.max(1, 1.4 * k);
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) { ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + i * 2.6 * k, g.y - (7 - Math.abs(i)) * 1.7 * k); }
    ctx.stroke();
  }
}

// Boîte en perspective : on ne dessine que les faces visibles depuis la caméra
function poly(pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); }
function shade(pts, fill, lw = PAL.lw) { poly(pts); ctx.fillStyle = fill; ctx.fill(); if (lw) { ctx.strokeStyle = PAL.line; ctx.lineWidth = lw; ctx.stroke(); } }
function box(x0, x1, y0, y1, z0, z1, c) {
  const lw = c.lw === undefined ? PAL.lw : c.lw;
  if (x1 < CAM_X) shade([P3(x1, y0, z0), P3(x1, y0, z1), P3(x1, y1, z1), P3(x1, y1, z0)], c.side, lw);
  if (x0 > CAM_X) shade([P3(x0, y0, z0), P3(x0, y0, z1), P3(x0, y1, z1), P3(x0, y1, z0)], c.side, lw);
  if (y1 < CAM_H) shade([P3(x0, y1, z0), P3(x1, y1, z0), P3(x1, y1, z1), P3(x0, y1, z1)], c.top, lw);
  shade([P3(x0, y0, z0), P3(x1, y0, z0), P3(x1, y1, z0), P3(x0, y1, z0)], c.front, lw);
}
function line3(a, b) { const p = P3(...a), q = P3(...b); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); }

function drawWall() {
  const lvl = S.wall.lvl, wc = PAL.walls[lvl], T = wallT(lvl), Hh = wallH(lvl);
  const ratio = Math.min(1, S.wall.hp / wallMax(lvl));
  const n = WALL_DMG.length, dz = (WZ1 - WZ0) / n;
  if (S.wall.hp <= 0) {
    for (let i = n - 1; i >= 0; i--) {
      const z0 = WZ0 + i * dz;
      box(WALL_X - 2, WALL_X + T + 3, 0, 2 + WALL_DMG[i] * 4, z0, z0 + dz, { side: wc.face, top: wc.top, front: wc.front, lw: 1.2 });
    }
    return;
  }
  // Segments du plus loin au plus proche ; leur hauteur baisse avec les dégâts
  const hAt = i => Hh * (1 - WALL_DMG[i] * (1 - ratio) * 0.75);
  for (let i = n - 1; i >= 0; i--) {
    const z0 = WZ0 + i * dz, z1 = z0 + dz, h = hAt(i);
    box(WALL_X, WALL_X + T, 0, h, z0, z1, { side: wc.face, top: wc.top, front: wc.front, lw: 0 });
    ctx.strokeStyle = wc.joint; ctx.lineWidth = 1;
    ctx.beginPath();
    if (lvl === 0) {
      for (let z = z0 + 3.5; z < z1; z += 3.5) line3([WALL_X, 0, z], [WALL_X, h, z]);
    } else if (lvl < 4) {
      const rowH = lvl === 3 ? 7 : 4.5;
      for (let y = rowH, r = 0; y < h; y += rowH, r++) {
        line3([WALL_X, y, z0], [WALL_X, y, z1]);
        const off = (r % 2) * (dz / 4);
        for (let z = z0 + off + dz / 4; z < z1; z += dz / 2) line3([WALL_X, y - rowH, z], [WALL_X, y, z]);
      }
    } else {
      line3([WALL_X, h * 0.5, z0], [WALL_X, h * 0.5, z1]);
      if (lvl === 5) line3([WALL_X, h * 0.25, z0], [WALL_X, h * 0.25, z1]);
    }
    ctx.stroke();
    // Arête du dessus de chaque segment
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 1.2; ctx.beginPath();
    line3([WALL_X, h, z0], [WALL_X, h, z1]); line3([WALL_X + T, h, z0], [WALL_X + T, h, z1]);
    if (i < n - 1 && hAt(i + 1) > h) line3([WALL_X, h, z1], [WALL_X, hAt(i + 1), z1]);
    ctx.stroke();
  }
  // Contour
  ctx.strokeStyle = PAL.line; ctx.lineWidth = PAL.lw;
  ctx.beginPath();
  line3([WALL_X, 0, WZ1], [WALL_X, 0, WZ0]); line3([WALL_X, 0, WZ0], [WALL_X + T, 0, WZ0]);
  line3([WALL_X + T, 0, WZ0], [WALL_X + T, hAt(0), WZ0]); line3([WALL_X, 0, WZ0], [WALL_X, hAt(0), WZ0]);
  line3([WALL_X, 0, WZ1], [WALL_X, hAt(n - 1), WZ1]);
  ctx.stroke();
  if (ratio < 0.5) {
    ctx.strokeStyle = PAL.crack; ctx.lineWidth = 1.3; ctx.beginPath();
    for (let i = 1; i < n; i += 3) { const z = WZ0 + i * dz; line3([WALL_X, hAt(i) * 0.9, z], [WALL_X, hAt(i) * 0.5, z + dz * 0.6]); line3([WALL_X, hAt(i) * 0.5, z + dz * 0.6], [WALL_X, hAt(i) * 0.2, z + dz * 0.2]); }
    ctx.stroke();
  }
  const top = P3(WALL_X, Hh + 16, (WZ0 + WZ1) / 2);
  hpBar(top.x - 28, top.y, 56, ratio);
}

function drawBuilding() {
  const f = S.bld.floors, h = bldH();
  const ratio = S.bld.hp / bldMax(f);
  box(BX0, BX1, 0, h, BZ0, BZ1, { side: PAL.bldLeft, top: PAL.bldTop, front: PAL.bldFront });
  ctx.strokeStyle = PAL.bldTrim; ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 1; i < f; i++) { line3([BX0, i * FH, BZ0], [BX0, i * FH, BZ1]); line3([BX0, i * FH, BZ0], [BX1, i * FH, BZ0]); }
  ctx.stroke();
  for (let i = 0; i < f; i++) {
    const y0 = i * FH + 11, y1 = y0 + 15;
    windowQuad([[BX0, y0, DECO_Z - 14], [BX0, y0, DECO_Z + 14], [BX0, y1, DECO_Z + 14], [BX0, y1, DECO_Z - 14]], true);
    windowQuad([[BX0, y0, ALLY_Z - 14], [BX0, y0, ALLY_Z + 14], [BX0, y1, ALLY_Z + 14], [BX0, y1, ALLY_Z - 14]], false);
    windowQuad([[BX0 + 12, y0, BZ0], [BX0 + 32, y0, BZ0], [BX0 + 32, y1, BZ0], [BX0 + 12, y1, BZ0]], true);
    if (i > 0) windowQuad([[BX0 + 58, y0, BZ0], [BX0 + 78, y0, BZ0], [BX0 + 78, y1, BZ0], [BX0 + 58, y1, BZ0]], true);
  }
  shade([P3(BX0 + 56, 0, BZ0), P3(BX0 + 76, 0, BZ0), P3(BX0 + 76, 24, BZ0), P3(BX0 + 56, 24, BZ0)], PAL.door, 1.5);
  if (h < CAM_H) {
    ctx.strokeStyle = PAL.line; ctx.lineWidth = 1.4; ctx.beginPath();
    line3([BX0 + 4, h, BZ0 + 4], [BX1 - 4, h, BZ0 + 4]); line3([BX0 + 4, h, BZ0 + 4], [BX0 + 4, h, BZ1 - 4]);
    ctx.stroke();
  }
  const lost = 1 - ratio;
  ctx.strokeStyle = PAL.crack; ctx.lineWidth = 1.5;
  for (let i = 0; i < f; i++) for (let k = 0; k < 2; k++) {
    if (lost < 0.25 + k * 0.3) continue;
    ctx.beginPath();
    CRACKS[i * 2 + k].forEach(([z, y], j) => { const p = P3(BX0, i * FH + FH - y, z); j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.stroke();
  }
  const top = P3(BX0, h + 14, (BZ0 + BZ1) / 2);
  hpBar(top.x - 20, Math.max(62, top.y - 10), 120, ratio);
}

function windowQuad(pts, deco) {
  const p = pts.map(a => P3(...a));
  shade(p, PAL.window, 1.4);
  if (deco && !PAL.paper) {
    ctx.strokeStyle = PAL.windowFrame; ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo((p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2); ctx.lineTo((p[2].x + p[3].x) / 2, (p[2].y + p[3].y) / 2);
    ctx.stroke();
  }
}

function hpBar(x, y, w, ratio) {
  ctx.fillStyle = PAL.barBg; ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = ratio > 0.35 ? PAL.bar : PAL.barLow; ctx.fillRect(x, y, w * clamp(ratio, 0, 1), 7);
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, 7);
}

// --- Stickmen : pieds en (0,0), tournés vers la droite, ~50 px de haut ---
function limb(x, y, a, l1, b, l2) {
  const x1 = x + Math.sin(a) * l1, y1 = y + Math.cos(a) * l1;
  return [x, y, x1, y1, x1 + Math.sin(a + b) * l2, y1 + Math.cos(a + b) * l2];
}
function seg(j) { ctx.beginPath(); ctx.moveTo(j[0], j[1]); ctx.lineTo(j[2], j[3]); ctx.lineTo(j[4], j[5]); ctx.stroke(); }

// Pose : angles des jambes et des bras (0 = vers le bas, positif = vers l'avant)
function pose(type, e, walk) {
  const att = e && e.attacking;
  const P = { hipY: -22, lean: 0.12, legs: [[0.2, 0], [-0.2, 0]], arms: [[0.3, 0.6], [-0.2, 0.5]], item: null };
  if (e && !att) {
    // Course : jambes à deux segments, bras opposés, buste penché
    const run = type === 'gunner' || type === 'bazooka' ? 0.8 : 1;
    P.lean = 0.28 * run;
    for (let i = 0; i < 2; i++) {
      const q = walk + i * Math.PI;
      P.legs[i] = [0.75 * Math.sin(q) * run, -(0.25 + 1.3 * Math.max(0, Math.cos(q))) * run];
      P.arms[i] = [-0.9 * Math.sin(q), 1.4];
    }
  }
  if (type === 'sword' || type === 'brute') {
    const T = 1 / ENEMY[type].rate;
    const u = att ? 1 - clamp(e.cd / T, 0, 1) : 0;
    const a = att ? (u < 0.7 ? lerp(0.9, 3.7, ease(u / 0.7)) : lerp(3.7, 0.9, ease((u - 0.7) / 0.3))) : 2.2 + Math.sin(walk) * 0.15;
    P.arms[0] = [a, att ? 0.2 : -0.6];
    if (att) { P.legs = [[0.45, -0.25], [-0.35, 0]]; P.lean = u > 0.7 ? 0.35 : -0.05; }
    P.item = type;
  } else if (type === 'gunner') {
    P.arms = [[1.45, 0.15], [1.15, 0.55]];
    if (att) { P.legs = [[0.3, -0.1], [-0.3, 0]]; P.lean = 0.05; }
    P.item = 'gun';
  } else if (type === 'bazooka') {
    P.arms = [[2.0, 1.0], [1.3, 1.2]];
    if (att) { P.legs = [[1.45, -1.45], [-0.2, -1.35]]; P.hipY = -13; P.lean = 0.05; }
    P.item = 'tube';
  } else if (type === 'shield') {
    P.arms = [[1.35, 0.2], [1.2, 0.4]];
    if (att) { P.legs = [[0.4, -0.2], [-0.35, 0]]; P.lean = 0.1 + Math.max(0, Math.sin((1 - e.cd) * 5)) * 0.25; }
    else P.lean = 0.15;
    P.item = 'shield';
  } else if (type === 'dynamite') {
    P.arms[0] = [2.7, -0.2];
    if (att) { P.legs = [[1.45, -1.45], [-0.2, -1.35]]; P.hipY = -13; P.arms[0] = [1.2, 0.4]; }
    P.item = 'dyn';
  } else if (type === 'medic') {
    P.arms[0] = [0.5, 0.4];
    if (att) P.legs = [[0.2, 0], [-0.2, 0]];
    P.item = 'kit';
  } else if (type === 'mortar') {
    P.arms = [[1.0, 0.8], [0.8, 1.0]];
    if (att) { P.legs = [[1.45, -1.45], [-0.2, -1.35]]; P.hipY = -13; P.lean = 0.1; }
    P.item = 'mortar';
  }
  return P;
}

function drawStick(type, e, walk, col, teamCol) {
  const P = pose(type, e, walk);
  const L = [limb(0, P.hipY, P.legs[0][0], 11, P.legs[0][1], 11), limb(0, P.hipY, P.legs[1][0], 11, P.legs[1][1], 11)];
  const lift = Math.max(L[0][5], L[1][5]);
  ctx.save(); ctx.translate(0, -lift);
  const sx = Math.sin(P.lean) * 15, sy = P.hipY - Math.cos(P.lean) * 15;
  const hx = sx + Math.sin(P.lean) * 8, hy = sy - Math.cos(P.lean) * 8;
  const A = [limb(sx, sy, P.arms[0][0], 8.5, P.arms[0][1], 8.5), limb(sx, sy, P.arms[1][0], 8.5, P.arms[1][1], 8.5)];
  const base = ctx.globalAlpha;
  ctx.strokeStyle = col;
  ctx.globalAlpha = base * 0.55; seg(L[1]); seg(A[1]); ctx.globalAlpha = base;
  ctx.beginPath(); ctx.moveTo(0, P.hipY); ctx.lineTo(sx, sy); ctx.stroke();
  seg(L[0]);
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.fill();
  if (teamCol) {
    if (type === 'gunner') { ctx.fillStyle = teamCol; ctx.beginPath(); ctx.arc(hx, hy - 1, 7, Math.PI, 0); ctx.fill(); }
    else {
      ctx.strokeStyle = teamCol;
      ctx.beginPath(); ctx.moveTo(hx - 6, hy - 2); ctx.lineTo(hx + 6, hy - 2.5); ctx.moveTo(hx - 6, hy - 2); ctx.lineTo(hx - 11, hy + 1 + Math.sin(walk * 2) * 1.5); ctx.stroke();
    }
  }
  const hand = [A[0][4], A[0][5]];
  ctx.strokeStyle = col;
  if (P.item === 'sword' || P.item === 'brute') {
    const ang = P.arms[0][0] + P.arms[0][1];
    const dx = Math.sin(ang), dy = Math.cos(ang);
    const lw = ctx.lineWidth;
    if (P.item === 'sword') {
      ctx.strokeStyle = PAL.metal; ctx.lineWidth = lw * 1.2;
      ctx.beginPath(); ctx.moveTo(hand[0], hand[1]); ctx.lineTo(hand[0] + dx * 22, hand[1] + dy * 22); ctx.stroke();
      ctx.strokeStyle = PAL.gun; ctx.beginPath(); ctx.moveTo(hand[0] - dy * 3, hand[1] + dx * 3); ctx.lineTo(hand[0] + dy * 3, hand[1] - dx * 3); ctx.stroke();
    } else {
      ctx.strokeStyle = PAL.wood; ctx.lineWidth = lw * 2.4;
      ctx.beginPath(); ctx.moveTo(hand[0], hand[1]); ctx.lineTo(hand[0] + dx * 17, hand[1] + dy * 17); ctx.stroke();
    }
    ctx.lineWidth = lw;
  } else if (P.item === 'gun') {
    const rc = e && e.muzzle > 0 ? -1.5 : 0;
    const gx = sx + 2 + rc, gy = sy + 4, lw = ctx.lineWidth;
    ctx.strokeStyle = PAL.gun; ctx.lineWidth = lw * 1.8;
    ctx.beginPath(); ctx.moveTo(gx - 3, gy); ctx.lineTo(gx + 19, gy - 1); ctx.stroke();
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(gx + 8, gy); ctx.lineTo(gx + 7, gy + 6); ctx.stroke();
    if (e && e.muzzle > 0) { ctx.fillStyle = PAL.flash; ctx.beginPath(); ctx.arc(gx + 23, gy - 1, 4.5, 0, Math.PI * 2); ctx.fill(); }
  } else if (P.item === 'tube') {
    const lw = ctx.lineWidth;
    ctx.strokeStyle = teamCol || PAL.gun; ctx.lineWidth = lw * 2.8;
    ctx.beginPath(); ctx.moveTo(sx - 13, sy + 1); ctx.lineTo(sx + 17, sy - 6); ctx.stroke();
    ctx.lineWidth = lw;
    if (e && e.muzzle > 0) { ctx.fillStyle = PAL.flash; ctx.beginPath(); ctx.arc(sx + 22, sy - 7, 6, 0, Math.PI * 2); ctx.fill(); }
  }
  else if (P.item === 'shield') {
    const bx = sx + 6, lw = ctx.lineWidth;
    ctx.fillStyle = PAL.shieldPlate; ctx.strokeStyle = PAL.line; ctx.lineWidth = lw * 0.8;
    ctx.beginPath(); ctx.roundRect(bx, sy - 9, 8, 42 + P.hipY + 22, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.window; ctx.fillRect(bx + 2, sy - 5, 4, 5);
    ctx.lineWidth = lw;
  } else if (P.item === 'dyn') {
    const lw = ctx.lineWidth;
    ctx.strokeStyle = PAL.dyn; ctx.lineWidth = lw * 1.9;
    ctx.beginPath(); ctx.moveTo(hand[0], hand[1] + 3); ctx.lineTo(hand[0] + 2, hand[1] - 7); ctx.stroke();
    ctx.lineWidth = lw;
    if (Math.random() < 0.8) { ctx.fillStyle = PAL.flash; ctx.beginPath(); ctx.arc(hand[0] + 3, hand[1] - 10, 2 + Math.random() * 2, 0, Math.PI * 2); ctx.fill(); }
  } else if (P.item === 'kit') {
    ctx.fillStyle = PAL.medic; ctx.strokeStyle = PAL.line; ctx.lineWidth = 1.2;
    ctx.fillRect(hand[0] - 4, hand[1] - 1, 9, 7); ctx.strokeRect(hand[0] - 4, hand[1] - 1, 9, 7);
    ctx.fillStyle = PAL.dyn; ctx.fillRect(hand[0] - 0.5, hand[1], 2, 5); ctx.fillRect(hand[0] - 2, hand[1] + 1.5, 5, 2);
    ctx.lineWidth = 2.6;
  } else if (P.item === 'mortar') {
    const lw = ctx.lineWidth;
    ctx.strokeStyle = PAL.gun; ctx.lineWidth = lw * 2.2;
    ctx.beginPath();
    if (e && e.attacking) { ctx.moveTo(12, P.hipY + 13); ctx.lineTo(20, P.hipY - 9); }
    else { ctx.moveTo(sx - 6, sy + 4); ctx.lineTo(sx - 10, sy - 14); }
    ctx.stroke();
    ctx.lineWidth = lw;
    if (e && e.attacking) { ctx.beginPath(); ctx.moveTo(17, P.hipY - 3); ctx.lineTo(23, P.hipY + 13); ctx.stroke(); }
    if (e && e.muzzle > 0) { ctx.fillStyle = PAL.flash; ctx.beginPath(); ctx.arc(21, P.hipY - 12, 5, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.strokeStyle = col; seg(A[0]);
  ctx.restore();
}

function drawHorse(e, walk, col) {
  const att = e && e.attacking;
  const moving = e && !att;
  const legs = [[13, 0], [9, 2.2], [-13, 1.1], [-17, 3.3]];
  const base = ctx.globalAlpha;
  ctx.strokeStyle = PAL.paper ? INK : PAL.horseDark; ctx.lineWidth = 3.4;
  legs.forEach(([x, ph], i) => {
    const q = walk + ph;
    const j = moving ? limb(x, -26, 0.55 * Math.sin(q), 13, -0.9 * Math.max(0, Math.cos(q)), 13) : limb(x, -26, Math.sin(S.t * 3 + ph) * 0.06, 13, 0, 13);
    ctx.globalAlpha = base * (i % 2 ? 0.6 : 1);
    seg(j);
  });
  ctx.globalAlpha = base;
  ctx.lineWidth = PAL.lw;
  const bob = moving ? Math.sin(walk * 2) * 1.5 : 0;
  ctx.fillStyle = PAL.horse; ctx.strokeStyle = PAL.line;
  ctx.beginPath(); ctx.ellipse(-2, -31 + bob, 21, 8.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, -35 + bob); ctx.lineTo(22, -50 + bob); ctx.lineTo(28, -48 + bob); ctx.lineTo(19, -30 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(29, -48 + bob, 7, 3.6, 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = PAL.paper ? INK : PAL.horseDark; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-22, -33 + bob); ctx.quadraticCurveTo(-30, -30, -29, -18 + Math.sin(walk * 2) * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, -49 + bob); ctx.lineTo(15, -42 + bob); ctx.stroke();
  // Cavalier
  ctx.lineWidth = 2.6;
  ctx.save(); ctx.translate(0, bob);
  const u = att ? 1 - clamp(e.cd / (1 / ENEMY.rider.rate), 0, 1) : 0;
  const a = att ? (u < 0.7 ? lerp(1.2, 3.6, ease(u / 0.7)) : lerp(3.6, 1.2, ease((u - 0.7) / 0.3))) : 2.5;
  ctx.strokeStyle = col;
  ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(3, -55); ctx.stroke();
  seg(limb(0, -38, 0.6, 9, -0.9, 9));
  const arm = limb(3, -53, a, 8, -0.4, 8);
  seg(arm);
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(4, -61, 5.5, 0, Math.PI * 2); ctx.fill();
  if (PAL.team) { ctx.strokeStyle = PAL.team.rider; ctx.beginPath(); ctx.moveTo(-1, -50); ctx.lineTo(6, -44); ctx.stroke(); }
  const ang = a - 0.4;
  ctx.strokeStyle = PAL.metal; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(arm[4], arm[5]); ctx.quadraticCurveTo(arm[4] + Math.sin(ang) * 10 + 3, arm[5] + Math.cos(ang) * 10, arm[4] + Math.sin(ang) * 20, arm[5] + Math.cos(ang) * 20); ctx.stroke();
  ctx.restore();
}

function drawTank(e, x, z, burnt) {
  const t = PAL.tank;
  const c = { side: t[1], top: t[0], front: t[1] };
  const tr = { side: t[2], top: t[2], front: t[2] };
  box(x - 32, x + 34, 0, 9, z + 7, z + 14, tr);
  box(x - 30, x + 32, 6, 17, z - 12, z + 12, c);
  box(x - 32, x + 34, 0, 9, z - 14, z - 7, tr);
  box(x - 14, x + 10, 17, 26, z - 8, z + 8, c);
  const b0 = P3(x + 10, 22, z), b1 = P3(x + 44, 23, z);
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 4.5 * b0.k * 0.5;
  ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
  ctx.strokeStyle = t[1]; ctx.lineWidth = 2.6 * b0.k * 0.5;
  ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
  const near = P3(x, 4.5, z - 14);
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 1.2;
  const roll = e ? (e.walk * 3) % 1 : 0;
  for (let k = -24; k <= 26; k += 12.5) {
    const w = P3(x + k, 4.5, z - 14), r = 3.2 * near.k * 0.5;
    ctx.beginPath(); ctx.arc(w.x, w.y, r, 0, Math.PI * 2); ctx.stroke();
    const a = roll * Math.PI * 2; ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + Math.cos(a) * r, w.y + Math.sin(a) * r); ctx.stroke();
  }
  if (e && e.muzzle > 0) { ctx.fillStyle = PAL.flash; ctx.beginPath(); ctx.arc(b1.x + 4, b1.y, 9 * b0.k * 0.5, 0, Math.PI * 2); ctx.fill(); }
  if (burnt) {
    const a = P3(x - 32, 0, z - 14), b = P3(x + 34, 26, z - 14), top = P3(x, 26, z + 14);
    ctx.fillStyle = 'rgba(30,25,20,0.45)';
    ctx.fillRect(a.x, top.y, b.x - a.x, a.y - top.y);
  }
}

function drawShadow(x, z, w) {
  const p = P3(x, 0, z);
  ctx.fillStyle = PAL.shadow;
  ctx.beginPath(); ctx.ellipse(p.x, p.y, w * p.k, 2.6 * p.k, 0, 0, Math.PI * 2); ctx.fill();
}

// Ellipse au sol en perspective (rayon en unités monde)
function groundEllipse(x, z, r) {
  const c = P3(x, 0, z), a = P3(x + r, 0, z), n = P3(x, 0, z - r), f = P3(x, 0, z + r);
  ctx.beginPath(); ctx.ellipse(c.x, (n.y + f.y) / 2, a.x - c.x, (n.y - f.y) / 2, 0, 0, Math.PI * 2);
}

const SHADOW_W = { rider: 18, tank: 36, crawler: 5, arachnid: 26, queen: 60, walker: 30, drone: 10, heli: 34 };

function drawEnemy(e) {
  const def = e.def;
  if (e.type !== 'worm') drawShadow(e.x, e.z, SHADOW_W[e.type] || 8 * def.s);
  if (e.type === 'medic' && !e.demo) {
    ctx.fillStyle = PAL.heal; groundEllipse(e.x, e.z, def.healR * (0.9 + Math.sin(e.t * 3) * 0.1)); ctx.fill();
  }
  if (e.mods.includes('shieldgen')) {
    const c = P3(e.x, 45, e.z);
    ctx.fillStyle = 'rgba(111,195,255,0.10)'; ctx.strokeStyle = 'rgba(111,195,255,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(c.x, c.y, 90 * c.k * 0.75, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  if (e.elite) {
    const g = geom(e);
    if (g) { ctx.fillStyle = PAL.elite; ctx.beginPath(); ctx.ellipse((g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2, (g.x1 - g.x0) * 0.8, (g.y1 - g.y0) * 0.65, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.save();
  if (e.flash > 0 && (def.mech || def.boss)) ctx.filter = 'brightness(1.7)';
  drawBody(e, true);
  ctx.restore();
  if (e.hp < e.max && !e.demo && !def.boss) {
    const g = geom(e);
    if (g) {
      const w = Math.max(22, (g.x1 - g.x0) * 0.8), cx = (g.x0 + g.x1) / 2;
      ctx.fillStyle = PAL.barBg; ctx.fillRect(cx - w / 2, g.y0 - 9, w, 4);
      ctx.fillStyle = e.elite ? PAL.gold : PAL.blood; ctx.fillRect(cx - w / 2, g.y0 - 9, w * clamp(e.hp / e.max, 0, 1), 4);
    }
  }
}

// Dessine un ennemi (vivant) ou son épave / cadavre
function drawBody(e, alive) {
  switch (e.type) {
    case 'tank': drawTank(alive ? e : null, e.x, e.z, !alive); return;
    case 'walker': drawWalker(e, alive); return;
    case 'worm': drawWorm(e); return;
    case 'drone': case 'heli': drawFlyer(e, alive); return;
  }
  const p = P3(e.x, 0, e.z), u = p.k * U * e.def.s;
  ctx.translate(p.x, p.y); ctx.scale(u, u);
  if (e.type === 'crawler' || e.type === 'arachnid' || e.type === 'queen') { drawSpider(e, alive); return; }
  const col = alive && e.flash > 0 ? PAL.blood : PAL.stick;
  const team = e.elite ? PAL.gold : PAL.team && PAL.team[e.type];
  ctx.lineWidth = e.type === 'brute' ? 3.4 : 2.6;
  if (e.type === 'rider') drawHorse(alive ? e : null, e.walk, col);
  else drawStick(e.type, alive ? e : null, alive ? e.walk : 0, col, team);
}

// Araignées mécaniques : rampant (petit), arachnide, reine (énorme)
function drawSpider(e, alive) {
  const sc = e.type === 'crawler' ? 0.32 : e.type === 'queen' ? 2.3 : 1;
  ctx.save(); ctx.scale(sc, sc);
  const moving = alive && !e.attacking;
  const w = e.walk || 0;
  const by = alive ? -38 + (moving ? Math.sin(w * 2) * 1.5 : 0) : -12;
  const lw = 3.2 / Math.sqrt(sc);
  const hips = [-16, -2, 12];
  for (const far of [1, 0]) {
    ctx.strokeStyle = PAL.line; ctx.lineWidth = lw + 1.2;
    ctx.globalAlpha = far ? 0.55 : 1;
    hips.forEach((hx, i) => {
      const ph = w + i * 2.1 + far * Math.PI;
      const fx = hx + (i - 1) * 16 + (moving ? Math.sin(ph) * 9 : 0) + (alive ? 0 : (i - 1) * 8);
      const lift = moving ? Math.max(0, Math.cos(ph)) * 7 : 0;
      const kx = (hx + fx) / 2 + (i - 1) * 6, ky = alive ? by - 20 : by - 4;
      ctx.beginPath(); ctx.moveTo(hx, by); ctx.lineTo(kx, ky); ctx.lineTo(fx, -lift); ctx.stroke();
      ctx.strokeStyle = PAL.mechLight; ctx.lineWidth = lw * 0.55;
      ctx.beginPath(); ctx.moveTo(hx, by); ctx.lineTo(kx, ky); ctx.lineTo(fx, -lift); ctx.stroke();
      ctx.strokeStyle = PAL.line; ctx.lineWidth = lw + 1.2;
    });
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = lw * 0.7; ctx.strokeStyle = PAL.line;
  if (e.type === 'queen') {
    ctx.fillStyle = PAL.egg;
    ctx.beginPath(); ctx.ellipse(-30, by + 2, 20, 15 + (alive ? Math.sin(e.t * 4) : 0), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = e.elite ? PAL.gold : PAL.mech;
  ctx.beginPath(); ctx.ellipse(0, by, 24, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14, by - 4); ctx.lineTo(10, by - 6); ctx.moveTo(-16, by + 4); ctx.lineTo(12, by + 3); ctx.stroke();
  ctx.fillStyle = PAL.mechLight;
  ctx.beginPath(); ctx.arc(24, by - 2, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (e.type !== 'crawler') {
    ctx.fillStyle = PAL.mechLight;
    ctx.fillRect(-14, by - 21, 20, 9); ctx.strokeRect(-14, by - 21, 20, 9);
    ctx.fillStyle = PAL.line;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(7, by - 18.5 + i * 2.2, 1, 0, Math.PI * 2); ctx.fill(); }
    if (alive && e.muzzle > 0) { ctx.fillStyle = PAL.flash; ctx.beginPath(); ctx.arc(9, by - 17, 5, 0, Math.PI * 2); ctx.fill(); }
  }
  if (alive) {
    ctx.fillStyle = 'rgba(255,59,48,0.35)'; ctx.beginPath(); ctx.arc(29, by - 3, 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = alive ? PAL.eye : PAL.line;
  ctx.beginPath(); ctx.arc(29, by - 3, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Marcheur : robot à deux jambes (genoux inversés) et une cabine
function drawWalker(e, alive) {
  const p = P3(e.x, 0, e.z), u = p.k * U;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(u, u);
  const fallen = e.fallen || !alive;
  const moving = alive && !e.attacking && !fallen;
  const t = e.walk || 0;
  const cabY = fallen ? -78 : -157 - (moving ? Math.abs(Math.sin(t)) * 3 : 0);
  const leg = (i, hx) => {
    const broken = e.legs && e.legs[i] <= 0;
    const ph = t + i * Math.PI;
    const footX = hx + (moving ? Math.sin(ph) * 18 : 0), lift = moving ? Math.max(0, Math.cos(ph)) * 12 : 0;
    const hipY = cabY + 46;
    const pts = fallen
      ? [[hx, hipY], [hx + 26, -16], [hx + 34, 0]]
      : [[hx, hipY], [(hx + footX) / 2 + 22, -62 - lift * 0.5], [footX, -lift]];
    const draw = (w, c) => {
      ctx.strokeStyle = c; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]);
      if (!broken) ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.stroke();
    };
    draw(14, PAL.line); draw(10, PAL.walkerDark);
    if (!broken) {
      ctx.fillStyle = PAL.walkerDark; ctx.strokeStyle = PAL.line; ctx.lineWidth = 2;
      ctx.fillRect(pts[2][0] - 12, pts[2][1] - 5, 26, 5); ctx.strokeRect(pts[2][0] - 12, pts[2][1] - 5, 26, 5);
    } else if (alive && Math.random() < 0.3) {
      particle(p.x + pts[1][0] * u, p.y + pts[1][1] * u, rand(-30, 30), rand(-80, -20), PAL.flash, 0.3, 1.6, p.y);
    }
    ctx.fillStyle = PAL.walker; ctx.strokeStyle = PAL.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pts[1][0], pts[1][1], 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
  ctx.globalAlpha *= 0.8; leg(0, -14); ctx.globalAlpha /= 0.8;
  ctx.save();
  if (fallen) { ctx.translate(0, cabY + 23); ctx.rotate(0.12); ctx.translate(0, -(cabY + 23)); }
  ctx.fillStyle = e.elite ? PAL.gold : PAL.walker; ctx.strokeStyle = PAL.line; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.roundRect(-36, cabY, 76, 46, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL.walkerDark; ctx.fillRect(-36, cabY + 30, 76, 6);
  ctx.fillStyle = PAL.window; ctx.fillRect(8, cabY + 10, 26, 10); ctx.strokeRect(8, cabY + 10, 26, 10);
  if (alive) { ctx.fillStyle = PAL.eye; ctx.fillRect(12, cabY + 14, 18, 2.5); }
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(34, cabY + 32); ctx.lineTo(68, cabY + 30); ctx.stroke();
  ctx.strokeStyle = PAL.walkerDark; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(34, cabY + 32); ctx.lineTo(68, cabY + 30); ctx.stroke();
  if (alive && e.muzzle > 0) { ctx.fillStyle = PAL.flash; ctx.beginPath(); ctx.arc(72, cabY + 30, 8, 0, Math.PI * 2); ctx.fill(); }
  if (e.mods.includes('missiles')) {
    ctx.fillStyle = PAL.walkerDark; ctx.strokeStyle = PAL.line; ctx.lineWidth = 2;
    ctx.fillRect(-32, cabY - 10, 20, 10); ctx.strokeRect(-32, cabY - 10, 20, 10);
  }
  if (e.mods.includes('passenger') && alive) {
    ctx.save(); ctx.translate(4, cabY); ctx.scale(0.5, 0.5);
    drawSpider({ type: 'arachnid', walk: 0, attacking: true, muzzle: 0, t: e.t, mods: [] }, true);
    ctx.restore();
  }
  ctx.restore();
  leg(1, 12);
  ctx.restore();
}

// Ver des sables : corps annelé qui sort du sable, gueule ouverte
function drawWorm(e) {
  const p = P3(e.x, 0, e.z), u = p.k * U;
  const em = e.dead ? Math.max(0, e.emerge0 - e.t * 0.8) : e.emerge;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(u, u);
  ctx.fillStyle = PAL.dune2; ctx.strokeStyle = PAL.duneLine; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(4, 0, 36 + em * 6, 7, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
  if (em > 0.02) {
    const n = 10, Hh = 140 * em, lunge = e.swing ? Math.sin(e.swing / 0.3 * Math.PI) * 14 : 0;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      pts.push([-8 + s * 30 + Math.sin(s * 3 + e.t * 2) * 6 + s * s * lunge, -Hh * s, 18 - s * 5]);
    }
    ctx.lineWidth = 2;
    for (const [x, y, r] of pts.slice(0, -1)) {
      ctx.fillStyle = e.flash > 0 ? '#e9b98a' : PAL.worm; ctx.strokeStyle = PAL.line;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = PAL.wormDark; ctx.beginPath(); ctx.arc(x, y, r * 0.7, -0.6, 0.9); ctx.stroke();
    }
    const [hx, hy] = pts[n];
    const open = 0.45 + (e.swing ? 0.3 : Math.sin(e.t * 5) * 0.12);
    ctx.fillStyle = PAL.worm; ctx.strokeStyle = PAL.line;
    ctx.beginPath(); ctx.arc(hx, hy, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.wormMouth;
    ctx.beginPath(); ctx.moveTo(hx + 2, hy); ctx.arc(hx + 2, hy, 15, -open, open); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f4ead6';
    for (let i = -2; i <= 2; i++) {
      const a = i * open / 2.5;
      ctx.beginPath(); ctx.moveTo(hx + 2 + Math.cos(a) * 15, hy + Math.sin(a) * 15); ctx.lineTo(hx + 2 + Math.cos(a) * 9, hy + Math.sin(a) * 9 + 1.5); ctx.lineTo(hx + 2 + Math.cos(a + 0.12) * 15, hy + Math.sin(a + 0.12) * 15); ctx.fill();
    }
  }
  ctx.restore();
}

// Drones et hélicoptères
function drawFlyer(e, alive) {
  const p = P3(e.x, e.alt, e.z), u = p.k * U;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(u, u);
  if (!alive) ctx.rotate(Math.min(1.2, e.t * 2));
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 2;
  const spin = alive ? Math.abs(Math.cos(e.walk)) : 0.3;
  if (e.type === 'drone') {
    ctx.beginPath(); ctx.moveTo(-13, -3); ctx.lineTo(13, -3); ctx.stroke();
    ctx.fillStyle = e.elite ? PAL.gold : PAL.mech;
    ctx.beginPath(); ctx.roundRect(-8, -5, 16, 8, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(60,60,60,0.35)';
    for (const x of [-13, 13]) { ctx.beginPath(); ctx.ellipse(x, -6, 2 + 8 * spin, 1.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    if (alive && Math.sin(e.t * 8) > 0) { ctx.fillStyle = PAL.eye; ctx.beginPath(); ctx.arc(0, 4, 1.8, 0, Math.PI * 2); ctx.fill(); }
  } else {
    ctx.fillStyle = e.elite ? PAL.gold : PAL.heli;
    ctx.beginPath(); ctx.moveTo(-24, -4); ctx.lineTo(-62, -9); ctx.lineTo(-62, -3); ctx.lineTo(-24, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-58, -8); ctx.lineTo(-64, -20); ctx.lineTo(-56, -20); ctx.lineTo(-52, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 28, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.glass; ctx.beginPath(); ctx.ellipse(16, -1, 10, 8, 0, -Math.PI / 2, Math.PI / 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14, 11); ctx.lineTo(-16, 16); ctx.moveTo(10, 11); ctx.lineTo(12, 16); ctx.moveTo(-24, 16); ctx.lineTo(22, 16); ctx.stroke();
    ctx.fillStyle = PAL.mech; ctx.fillRect(-6, 8, 14, 4); ctx.strokeRect(-6, 8, 14, 4);
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, -15); ctx.stroke();
    ctx.fillStyle = 'rgba(60,60,60,0.3)';
    ctx.beginPath(); ctx.ellipse(0, -15, 4 + 54 * spin, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-62, -8, 6, 0, Math.PI * 2); ctx.fill();
    if (alive && e.muzzle > 0) { ctx.fillStyle = PAL.flash; ctx.beginPath(); ctx.arc(10, 12, 5, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

function drawCorpse(c) {
  const life = c.def.boss ? 8 : c.type === 'tank' ? 7 : 4;
  const alpha = clamp((life - c.t) / 0.8, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  const organic = !c.def.mech && c.type !== 'worm';
  if (organic) {
    const p = P3(c.x, 0, c.z), u = p.k * U * c.def.s;
    const grow = clamp((c.t - 0.3) / 1.2, 0, 1);
    if (grow > 0) {
      ctx.fillStyle = PAL.blood; ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath(); ctx.ellipse(p.x - 26 * u, p.y, 11 * u * grow, 2.6 * u * grow, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha;
    }
    // Chute en arrière, puis le corps reste au sol
    const fall = ease(clamp(c.t / 0.4, 0, 1));
    ctx.translate(p.x, p.y); ctx.scale(u, u);
    ctx.rotate(-fall * Math.PI / 2 * (c.type === 'rider' ? 0.35 : 1));
    ctx.lineWidth = c.type === 'brute' ? 3.4 : 2.6;
    if (c.type === 'rider') drawHorse(null, c.walk, PAL.stick);
    else drawStick(c.type, null, 0, PAL.stick, c.elite ? PAL.gold : PAL.team && PAL.team[c.type]);
  } else {
    if (c.def.mech) ctx.filter = 'brightness(0.55)';
    drawBody(c, false);
    if ((c.type === 'tank' || c.def.boss) && Math.random() < 0.25) {
      const p = P3(c.x, 26, c.z);
      particle(p.x, p.y, rand(-8, 8), rand(-50, -25), `rgba(${PAL.smoke.join(',')},0.35)`, 1.5, rand(3, 7), 9999, -10);
    }
  }
  ctx.restore();
}

function drawProjectiles() {
  for (const p of S.proj) {
    if (p.t < 0) continue;
    const q = projPos(p);
    if (p.kind === 'bullet') {
      const n = projPos({ ...p, t: Math.max(0, p.t - 0.03) });
      ctx.strokeStyle = PAL.tracer; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(n.x, n.y); ctx.stroke();
    } else if (p.kind === 'shell' || p.kind === 'bomb') {
      ctx.fillStyle = PAL.line; ctx.beginPath(); ctx.arc(q.x, q.y, (p.kind === 'bomb' ? 1.6 : 2.2) * q.k, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'mortar') {
      ctx.fillStyle = PAL.line; ctx.beginPath(); ctx.arc(q.x, q.y, 2.6 * q.k, 0, Math.PI * 2); ctx.fill();
      interceptRing(q);
    } else {
      const n = projPos({ ...p, t: p.t + 0.02 });
      const a = Math.atan2(n.y - q.y, n.x - q.x), s = q.k * 0.6;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(a); ctx.scale(s, s);
      ctx.fillStyle = p.kind === 'rocket' ? PAL.rocket : PAL.allyRocket;
      ctx.strokeStyle = PAL.line; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-9, -3); ctx.lineTo(5, -3); ctx.lineTo(10, 0); ctx.lineTo(5, 3); ctx.lineTo(-9, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PAL.flash; ctx.beginPath(); ctx.arc(-11, 0, 2.5 + Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (p.kind === 'rocket') interceptRing(q);
    }
  }
}
function interceptRing(q) {
  ctx.strokeStyle = PAL.reticle; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.4; ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.arc(q.x, q.y, 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
}

// Barre de vie du boss en haut de l'écran
function drawBossBar() {
  const b = S.enemies.find(e => e.def.boss && !e.dead && !e.demo);
  if (!b || S.mode !== 'day') return;
  const w = 360, x = W / 2 - w / 2, y = 92;
  ctx.textAlign = 'center';
  ctx.font = `${PAL.paper ? 26 : 20}px ${FONT_D()}`;
  ctx.lineWidth = 5; ctx.strokeStyle = PAL.textHalo;
  const label = bossName(b) + (b.mods.length ? ' · ' + b.mods.map(m => MODULES[m]).join(', ') : '');
  ctx.strokeText(label, W / 2, y - 6); ctx.fillStyle = PAL.title; ctx.fillText(label, W / 2, y - 6);
  ctx.fillStyle = PAL.barBg; ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = PAL.barLow; ctx.fillRect(x, y, w * clamp(b.hp / b.max, 0, 1), 10);
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, 10);
  if (b.type === 'walker' && !b.fallen) {
    for (let i = 0; i < 2; i++) {
      const lx = x + i * (w / 2 + 4), lw = w / 2 - 4;
      ctx.fillStyle = PAL.barBg; ctx.fillRect(lx, y + 14, lw, 6);
      ctx.fillStyle = PAL.gold; ctx.fillRect(lx, y + 14, lw * clamp(b.legs[i] / b.legMax, 0, 1), 6);
      ctx.strokeRect(lx, y + 14, lw, 6);
    }
  }
}

// Tempête de sable : voile sur le fond du couloir
function drawStorm(L, Rr) {
  const c = mut('storm');
  if (!c || S.mode === 'title') return;
  const a = Math.min(0.75, 0.45 * c);
  const y1 = groundY(380);
  const g = ctx.createLinearGradient(0, HOR - 30, 0, y1);
  g.addColorStop(0, `rgba(${PAL.dust.join(',')},${a})`); g.addColorStop(0.75, `rgba(${PAL.dust.join(',')},${a * 0.8})`); g.addColorStop(1, `rgba(${PAL.dust.join(',')},0)`);
  const xr = P3(WALL_X - 20, 0, 470).x;
  ctx.fillStyle = g; ctx.fillRect(L, HOR - 30, xr - L, y1 - HOR + 30);
}

function drawFx() {
  for (const f of S.fx) {
    const k = 1 - f.t / f.life;
    if (f.kind === 'p') {
      ctx.fillStyle = f.color; ctx.globalAlpha = clamp(k * 1.5, 0, 1);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (f.g < 0 ? 2 - k : 1), 0, Math.PI * 2); ctx.fill();
    } else if (f.kind === 'tracer') {
      ctx.globalAlpha = k; ctx.strokeStyle = PAL.tracer; ctx.lineWidth = f.w;
      ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
    } else if (f.kind === 'flash') {
      ctx.globalAlpha = k; ctx.fillStyle = PAL.flash;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    } else if (f.kind === 'ring') {
      ctx.globalAlpha = k; ctx.strokeStyle = PAL.flash; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.4 - k * 0.6), 0, Math.PI * 2); ctx.stroke();
    } else if (f.kind === 'hitmark') {
      ctx.globalAlpha = k; ctx.strokeStyle = PAL.hitmark; ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.moveTo(f.x + sx * 9, f.y + sy * 9); ctx.lineTo(f.x + sx * 4, f.y + sy * 4); }
      ctx.stroke();
    } else if (f.kind === 'boom') {
      const r = f.r * (0.5 + (1 - k) * 0.9);
      ctx.globalAlpha = k;
      if (!PAL.paper) {
        ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff7a2f'; ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.65, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.3, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.strokeStyle = '#c62f3a'; ctx.lineWidth = 2; ctx.beginPath();
        for (let j = 0; j < 12; j++) { const a = j / 12 * Math.PI * 2, rr = j % 2 ? r * 0.7 : r * 1.1; j ? ctx.lineTo(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr) : ctx.moveTo(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr); }
        ctx.closePath(); ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawTexts() {
  ctx.textAlign = 'center';
  for (const t of S.texts) {
    ctx.globalAlpha = clamp((t.life - t.t) / 0.4, 0, 1);
    ctx.font = `700 ${t.size}px ${FONT()}`;
    ctx.lineWidth = 4; ctx.strokeStyle = PAL.textHalo; ctx.strokeText(t.txt, t.x, t.y);
    ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawVignette(L, Rr, T, B) {
  if (PAL.paper) return;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, 'rgba(40,20,5,0)'); g.addColorStop(1, 'rgba(40,20,5,0.28)');
  ctx.fillStyle = g; ctx.fillRect(L, T, Rr - L, B - T);
}

function drawBanner() {
  const b = S.banner;
  if (!b) return;
  const a = b.t < 0.3 ? b.t / 0.3 : clamp((3.4 - b.t) / 0.6, 0, 1);
  ctx.globalAlpha = a; ctx.textAlign = 'center';
  ctx.font = `${PAL.paper ? 64 : 50}px ${FONT_D()}`;
  ctx.lineWidth = 7; ctx.strokeStyle = PAL.textHalo;
  ctx.strokeText(b.title, W / 2, 110); ctx.fillStyle = PAL.title; ctx.fillText(b.title, W / 2, 110);
  ctx.font = `600 20px ${FONT()}`; ctx.lineWidth = 5;
  ctx.strokeText(b.sub, W / 2, 142); ctx.fillStyle = PAL.text; ctx.fillText(b.sub, W / 2, 142);
  ctx.globalAlpha = 1;
}

function drawReticle() {
  if (S.mode !== 'day' || !(pointer.down || pointer.mouse)) return;
  const x = pointer.x, y = pointer.y + S.kick;
  const ws = WEAPONS[S.w.tier];
  const r = ws.auto ? 14 + ws.spread * 0.5 : 13;
  ctx.strokeStyle = S.w.reloading > 0 ? 'rgba(120,120,120,0.6)' : PAL.reticle; ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.moveTo(x - r - 6, y); ctx.lineTo(x - 4, y); ctx.moveTo(x + 4, y); ctx.lineTo(x + r + 6, y);
  ctx.moveTo(x, y - r - 6); ctx.lineTo(x, y - 4); ctx.moveTo(x, y + 4); ctx.lineTo(x, y + r + 6);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
let hudCache = '';
function updateHud() {
  if (S.mode === 'title') return;
  const ws = weaponStats();
  const p = S.mode === 'day' ? clamp((S.total - S.queue.length - S.enemies.length) / Math.max(1, S.total), 0, 1) : 1;
  const key = [S.day, S.money, S.w.ammo, S.w.reloading > 0, S.w.tier, Math.round(p * 50), S.muts.length].join('|');
  if (key === hudCache) return;
  hudCache = key;
  $('hudDay').textContent = `Jour ${S.day}`;
  const cyc = `Cycle ${cycleOf(Math.max(1, S.day))}`;
  $('hudCycle').textContent = S.muts.length ? `${cyc} · ${[...new Set(S.muts)].map(m => MUTATIONS[m].name + (mut(m) > 1 ? ' ×' + mut(m) : '')).join(', ')}` : cyc;
  $('hudSun').style.width = `${p * 100}%`;
  $('hudMoney').textContent = moneyText();
  $('wName').textContent = ws.name;
  const am = $('wAmmo');
  if (S.w.reloading > 0) am.innerHTML = '<span>Rechargement…</span>';
  else if (ws.mag > 12) am.innerHTML = `<span>${S.w.ammo} / ${ws.mag}</span>`;
  else am.innerHTML = Array.from({ length: ws.mag }, (_, i) => `<i class="${i < S.w.ammo ? '' : 'empty'}"></i>`).join('');
}

// ---------------------------------------------------------------------------
// Boutique de nuit
// ---------------------------------------------------------------------------
const SHOP = [
  { group: 'Bâtiment', items: [
    { id: 'repairWall', name: () => S.wall.hp <= 0 ? 'Reconstruire le mur' : 'Réparer le mur',
      desc: () => `${WALL_NAMES[S.wall.lvl]} : ${Math.round(S.wall.hp)} / ${wallMax(S.wall.lvl)} PV. Répare autant que ton argent le permet.`,
      cost: () => Math.ceil((wallMax(S.wall.lvl) - S.wall.hp) * 0.45),
      lock: () => S.wall.hp >= wallMax(S.wall.lvl) ? 'Intact' : null, partial: true,
      buy: spent => { S.wall.hp = Math.min(wallMax(S.wall.lvl), S.wall.hp + spent / 0.45); } },
    { id: 'upWall', name: () => S.wall.lvl >= 5 ? 'Mur au maximum' : `Mur : ${WALL_NAMES[S.wall.lvl + 1]}`,
      desc: () => S.wall.lvl >= 5 ? 'Ton mur ne peut pas être plus solide.' : `PV max ${wallMax(S.wall.lvl)} → ${wallMax(S.wall.lvl + 1)}. Plus haut, plus épais.`,
      cost: () => Math.round(140 * Math.pow(1.7, S.wall.lvl)), lock: () => S.wall.lvl >= 5 ? 'Max' : null,
      buy: () => { S.wall.lvl++; S.wall.hp += wallMax(S.wall.lvl) - wallMax(S.wall.lvl - 1); } },
    { id: 'repairBld', name: () => 'Réparer le bâtiment',
      desc: () => `${Math.round(S.bld.hp)} / ${bldMax(S.bld.floors)} PV. Répare autant que ton argent le permet.`,
      cost: () => Math.ceil((bldMax(S.bld.floors) - S.bld.hp) * 0.55),
      lock: () => S.bld.hp >= bldMax(S.bld.floors) ? 'Intact' : null, partial: true,
      buy: spent => { S.bld.hp = Math.min(bldMax(S.bld.floors), S.bld.hp + spent / 0.55); } },
    { id: 'floor', name: () => S.bld.floors >= MAX_FLOORS ? '5 étages, maximum' : `Construire l'étage ${S.bld.floors + 1}`,
      desc: () => ({ 1: '+300 PV. Débloque les snipers.', 2: '+300 PV. Débloque les lance-roquettes.' })[S.bld.floors] || '+300 PV.',
      cost: () => Math.round(320 * Math.pow(1.85, S.bld.floors - 1)), lock: () => S.bld.floors >= MAX_FLOORS ? 'Max' : null,
      buy: () => { S.bld.floors++; S.bld.hp += 300; } },
  ] },
  { group: 'Tireurs', items: [
    ...Object.entries(SQUADS).map(([type, d]) => ({
      id: type, name: () => d.name, multi: 10,
      desc: () => `Étage ${d.floor}. ${d.desc} Caché, illimité. ${S.squads[type].length} en poste.`,
      cost: () => d.cost,
      lock: () => S.bld.floors < d.floor ? `Il faut ${d.floor} étages` : null,
      buy: () => { S.squads[type].push(rand(0, d.interval)); } })),
  ] },
  { group: 'Ton arme', items: [
    { id: 'dmg', name: () => `Dégâts (niv. ${S.w.dmg}/10)`, desc: () => '+22 % de dégâts par balle.',
      cost: () => Math.round(90 * Math.pow(1.55, S.w.dmg)), lock: () => S.w.dmg >= 10 ? 'Max' : null, buy: () => { S.w.dmg++; } },
    { id: 'rate', name: () => `Cadence (niv. ${S.w.rate}/8)`, desc: () => '+12 % de tirs par seconde.',
      cost: () => Math.round(110 * Math.pow(1.55, S.w.rate)), lock: () => S.w.rate >= 8 ? 'Max' : null, buy: () => { S.w.rate++; } },
    { id: 'reload', name: () => `Rechargement (niv. ${S.w.reload}/6)`, desc: () => 'Recharge 18 % plus vite.',
      cost: () => Math.round(70 * Math.pow(1.5, S.w.reload)), lock: () => S.w.reload >= 6 ? 'Max' : null, buy: () => { S.w.reload++; } },
    { id: 'evolve', name: () => S.w.tier >= 3 ? 'Minigun : arme ultime' : `Passer au ${WEAPONS[S.w.tier + 1].name}`,
      desc: () => S.w.tier >= 3 ? 'Tu as l\'arme la plus puissante.' : WEAPONS[S.w.tier + 1].desc,
      cost: () => S.w.tier >= 3 ? 0 : WEAPONS[S.w.tier + 1].cost, lock: () => S.w.tier >= 3 ? 'Max' : null,
      buy: () => { S.w.tier++; S.w.ammo = weaponStats().mag; } },
  ] },
];

function renderShop() {
  $('shopMoney').textContent = moneyText();
  const root = $('shopGroups');
  root.innerHTML = '';
  for (const g of SHOP) {
    const sec = document.createElement('section');
    sec.innerHTML = `<h3 class="group-title">${g.group}</h3>`;
    const cards = document.createElement('div');
    cards.className = 'cards';
    for (const it of g.items) {
      const lock = it.lock(), cost = it.cost();
      const affordable = it.partial ? S.money > 0 : S.money >= cost;
      const card = document.createElement('div');
      card.className = 'card' + (lock ? ' locked' : '');
      card.innerHTML = `<div class="name"></div><div class="desc"></div><div class="buy-row"><button id="buy-${it.id}"></button></div>`;
      card.querySelector('.name').textContent = it.name();
      card.querySelector('.desc').textContent = it.desc();
      const btn = card.querySelector('button');
      btn.textContent = lock || (it.partial && S.money < cost ? `Réparer pour ${S.money} $` : `${cost} $`);
      btn.disabled = !!lock || !affordable;
      btn.addEventListener('click', () => {
        if (it.lock()) return;
        const c = it.cost();
        if (it.partial) { const spent = Math.min(c, S.money); if (spent <= 0) return; S.money -= spent; it.buy(spent); }
        else { if (S.money < c) return; S.money -= c; it.buy(); }
        sfx('cash');
        renderShop();
      });
      if (it.multi && !lock) {
        const n = it.multi, b2 = document.createElement('button');
        b2.id = `buy-${it.id}-x${n}`;
        b2.textContent = `×${n} : ${cost * n} $`;
        b2.disabled = S.money < cost * n;
        b2.addEventListener('click', () => {
          if (S.money < it.cost() * n) return;
          S.money -= it.cost() * n;
          for (let i = 0; i < n; i++) it.buy();
          sfx('cash');
          renderShop();
        });
        card.querySelector('.buy-row').appendChild(b2);
      }
      cards.appendChild(card);
    }
    sec.appendChild(cards);
    root.appendChild(sec);
  }
}

// ---------------------------------------------------------------------------
// Son (bruit filtré, aucun fichier)
// ---------------------------------------------------------------------------
let AC = null, noiseBuf = null, muted = false;
try { muted = localStorage.getItem('sniper.muted') === '1'; } catch (e) { /* ignore */ }
function ensureAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const len = AC.sampleRate;
    noiseBuf = AC.createBuffer(1, len, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
const SFX = {
  shot: { f: 2600, d: 0.28, g: 0.34 }, auto: { f: 1700, d: 0.06, g: 0.1 }, ally: { f: 1900, d: 0.15, g: 0.08 },
  boom: { f: 420, d: 0.7, g: 0.45 }, launch: { f: 900, d: 0.35, g: 0.1 }, reload: { f: 4000, d: 0.04, g: 0.06 },
  thud: { f: 300, d: 0.08, g: 0.06 },
};
function sfx(k) {
  if (!AC || muted) return;
  const t = AC.currentTime;
  if (k === 'cash') {
    [880, 1320].forEach((fr, i) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'triangle'; o.frequency.value = fr;
      g.gain.setValueAtTime(0.12, t + i * 0.07); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.15);
      o.connect(g).connect(AC.destination); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.16);
    });
    return;
  }
  const p = SFX[k];
  const src = AC.createBufferSource(); src.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(p.f, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, p.f * 0.15), t + p.d);
  const g = AC.createGain();
  g.gain.setValueAtTime(p.g, t); g.gain.exponentialRampToValueAtTime(0.001, t + p.d);
  src.connect(f).connect(g).connect(AC.destination);
  src.start(t, Math.random() * 0.5); src.stop(t + p.d + 0.02);
}

// ---------------------------------------------------------------------------
// Entrées
// ---------------------------------------------------------------------------
const pointer = { x: 0, y: 0, down: false, mouse: false, id: null };
function toLogical(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: (ev.clientX - r.left - offX) / scale, y: (ev.clientY - r.top - offY) / scale };
}
canvas.addEventListener('pointerdown', ev => {
  ev.preventDefault();
  ensureAudio();
  if (pointer.down && ev.pointerId !== pointer.id) return;
  const p = toLogical(ev);
  Object.assign(pointer, p, { down: true, id: ev.pointerId, mouse: ev.pointerType === 'mouse' });
  try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
  if (S.mode === 'day' && !WEAPONS[S.w.tier].auto) fire(p.x, p.y);
});
canvas.addEventListener('pointermove', ev => {
  if (pointer.down && ev.pointerId !== pointer.id) return;
  Object.assign(pointer, toLogical(ev));
  pointer.mouse = ev.pointerType === 'mouse';
});
const release = ev => { if (ev.pointerId === pointer.id) { pointer.down = false; pointer.id = null; } };
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') pointer.mouse = false; });
canvas.addEventListener('contextmenu', ev => ev.preventDefault());

function setPaused(on) {
  if (on && S.mode === 'day') { S.mode = 'paused'; pointer.down = false; $('pause').hidden = false; }
  else if (!on && S.mode === 'paused') { S.mode = 'day'; $('pause').hidden = true; last = performance.now(); }
}

$('btnPlay').addEventListener('click', () => {
  ensureAudio();
  try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (e) { /* ignore */ }
  try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch (e) { /* ignore */ }
  newGame(false);
});
$('styleDesert').addEventListener('click', () => setStyle('desert'));
$('stylePaper').addEventListener('click', () => setStyle('paper'));
$('btnTest').addEventListener('click', () => { ensureAudio(); newGame(true); });
$('btnSkip').addEventListener('click', skipDay);
$('btnRetry').addEventListener('click', () => newGame(S.test));
$('btnMenu').addEventListener('click', toTitle);
$('btnNext').addEventListener('click', () => { ensureAudio(); startDay(); });
$('btnPause').addEventListener('click', () => setPaused(S.mode === 'day'));
$('btnResume').addEventListener('click', () => setPaused(false));
$('btnQuit').addEventListener('click', () => { S.mode = 'over'; $('pause').hidden = true; gameOver(); });
$('weapon').addEventListener('click', () => { if (S.mode === 'day') startReload(); });
$('btnRotateOk').addEventListener('click', () => $('rotate').classList.add('dismissed'));
function syncSound() { $('btnSound').textContent = muted ? 'Son : non' : 'Son : oui'; $('btnSound').setAttribute('aria-pressed', String(!muted)); }
$('btnSound').addEventListener('click', () => {
  muted = !muted; ensureAudio(); syncSound();
  try { localStorage.setItem('sniper.muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
});
window.addEventListener('keydown', ev => {
  if (ev.key === 'r' || ev.key === 'R') { if (S.mode === 'day') startReload(); }
  else if (ev.key === 'p' || ev.key === 'Escape') setPaused(S.mode === 'day');
});
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
window.addEventListener('resize', resize);
if (location.hash === '#debug') window.sniper = { state: () => S, endDay, startDay, newGame, geom, P3, spawn, hit };

function showBest() { $('best').textContent = best > 0 ? `Record : ${best} jour${best > 1 ? 's' : ''} tenu${best > 1 ? 's' : ''}` : ''; }
setStyle(style);
syncSound();
showBest();
resize();
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();
