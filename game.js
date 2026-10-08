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
  team: { sword: '#d6453d', gunner: '#4f7d3a', rider: '#8e44ad', brute: '#e67e22', bazooka: '#2c82c9' },
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
  sword:   { name: 'Épéiste',         hp: 40,   speed: 38, melee: true, dmg: 7,  rate: 1.0,  reward: 5,  s: 1,    half: 6 },
  gunner:  { name: 'Mitrailleur',     hp: 65,   speed: 30, range: [80, 170],  dmg: 2.4, pause: 1.7, reward: 9, s: 1, half: 6 },
  rider:   { name: 'Cavalier',        hp: 90,   speed: 95, melee: true, dmg: 12, rate: 0.9,  reward: 13, s: 1,    half: 18 },
  brute:   { name: 'Colosse',         hp: 280,  speed: 19, melee: true, dmg: 30, rate: 0.55, reward: 24, s: 1.45, half: 9 },
  bazooka: { name: 'Lance-roquettes', hp: 75,   speed: 26, range: [180, 250], dmg: 45, rate: 0.22, reward: 17, s: 1, half: 6 },
  tank:    { name: 'Tank',            hp: 1200, speed: 13, range: [200, 240], dmg: 80, rate: 0.17, reward: 95, s: 1, half: 32 },
};

const DAY_NEWS = {
  1: 'Des épéistes foncent sur le mur.',
  2: 'Des mitrailleurs arrivent. Ils tirent à distance.',
  4: 'Cavaliers : très rapides.',
  5: 'Colosses : lents, mais très résistants.',
  6: 'Lance-roquettes : ils visent le bâtiment.',
  8: 'Les tanks entrent en scène.',
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

const ALLY = {
  sniper: { name: 'Sniper',      cost: 280, interval: 1.7,  dmg: 75, range: 2000, head: 0.3, desc: 'Tir lent et puissant, portée infinie.' },
  rocket: { name: 'Lance-roquettes', cost: 750, interval: 3.0, dmg: 150, range: 420, splash: 45, unlock: 5,
            desc: 'Dégâts de zone. Idéal contre les groupes et les tanks.' },
};

// Tireurs cachés dans la maison : prix fixe, nombre illimité
const SHOOTER = { cost: 80, interval: 5, dmg: 25 };

const WALL_NAMES = ['Palissade', 'Mur de briques', 'Mur de pierre', 'Rempart', 'Béton', 'Béton armé'];
const wallMax = lvl => 220 + lvl * 240;
const wallH = lvl => 24 + lvl * 4;
const wallT = lvl => 6 + lvl;
const bldMax = f => 320 + (f - 1) * 300;

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
    allies: [], shooters: [], enemies: [], proj: [], fx: [], texts: [], corpses: [],
    queue: [], total: 0, dayT: 0, dayLen: 1, dayKills: 0, dayMoney: 0, endTimer: 0,
    banner: null, shake: 0, kick: 0, dyingT: 0, demoT: 0,
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
  const counts = {
    sword: 5 + d * 3,
    gunner: d >= 2 ? 2 + (d - 2) * 2 : 0,
    rider: d >= 4 ? 2 + (d - 4) * 2 : 0,
    brute: d >= 5 ? 1 + Math.floor((d - 5) * 0.7) : 0,
    bazooka: d >= 6 ? 1 + (d - 6) : 0,
    tank: d >= 8 ? 1 + Math.floor((d - 8) / 2) : 0,
  };
  const len = Math.min(25 + d * 5, 95);
  const q = [];
  for (const [type, c] of Object.entries(counts)) {
    for (let i = 0; i < c; i++) {
      const heavy = type === 'tank' || type === 'brute';
      const t = heavy ? len * rand(0.35, 1) : len * Math.pow(Math.random(), 0.85);
      q.push({ type, t: Math.max(0.8, t) });
    }
  }
  q.sort((a, b) => a.t - b.t);
  Object.assign(S, {
    mode: 'day', queue: q, total: q.length, dayT: 0, dayLen: len, dayKills: 0, dayMoney: 0, endTimer: 0,
    enemies: [], proj: [], corpses: [],
  });
  S.w.ammo = weaponStats().mag; S.w.reloading = 0; S.w.cd = 0;
  S.banner = { title: `Jour ${d}`, sub: DAY_NEWS[d] || 'Ils sont toujours plus nombreux.', t: 0 };
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

function spawn(type, demo) {
  const def = ENEMY[type];
  const mul = 1 + 0.07 * Math.max(0, S.day - 1);
  const z = rand(ZN, ZF);
  S.enemies.push({
    type, def, z, x: visLeftX(z) - rand(25, 60), hp: def.hp * mul, max: def.hp * mul,
    cd: rand(0.3, 1), walk: rand(0, 6), flash: 0, muzzle: 0, kb: 0,
    jit: rand(0, 9), range: def.range ? rand(def.range[0], def.range[1]) : 0, burst: 5,
    dmgMul: 1 + 0.04 * Math.max(0, S.day - 1), demo: demo ? rand(3, 6) : 0,
  });
}

// Zone touchable à l'écran (corps + tête)
function geom(e) {
  const p = P3(e.x, 0, e.z), u = p.k * U * e.def.s;
  if (e.type === 'tank') {
    const a = P3(e.x - 32, 0, e.z - 14), b = P3(e.x + 46, 0, e.z - 14), c = P3(e.x - 14, 28, e.z + 8);
    return { x0: a.x, x1: b.x, y0: c.y, y1: a.y, hr: 0, u };
  }
  if (e.type === 'rider') return { x0: p.x - 30 * u, x1: p.x + 36 * u, y0: p.y - 72 * u, y1: p.y, hx: p.x + 4 * u, hy: p.y - 64 * u, hr: 7 * u, u };
  const crouch = e.type === 'bazooka' && e.attacking ? 9 : 0;
  return { x0: p.x - 11 * u, x1: p.x + 14 * u, y0: p.y - (54 - crouch) * u, y1: p.y, hx: p.x + 5 * u, hy: p.y - (46 - crouch) * u, hr: 7 * u, u };
}

function updateEnemy(e, dt) {
  const def = e.def;
  const fx = frontX();
  let stopX = def.melee ? fx - def.half - e.jit : fx - e.range;
  if (!def.melee) stopX = Math.max(stopX, visLeftX(e.z) + 30);
  e.flash = Math.max(0, e.flash - dt);
  e.muzzle = Math.max(0, e.muzzle - dt);
  if (e.kb > 0) { e.x -= e.kb * dt * 60; e.kb = Math.max(0, e.kb - dt * 30); }
  if (e.demo) { e.demo -= dt; if (e.demo <= 0) { kill(e, false, true); return; } }
  if (e.x < stopX - 0.5) {
    e.x = Math.min(stopX, e.x + def.speed * dt);
    e.walk += dt * (e.type === 'rider' ? 11 : e.type === 'tank' ? 4 : 9 + def.speed * 0.05);
    e.attacking = false;
    return;
  }
  e.attacking = true;
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
      S.proj.push({ kind: 'rocket', x0: e.x + 8, y0: 19, z0: e.z, x1: BX0, y1: rand(6, bldH() - 6), z1: rand(BZ0 + 12, BZ1 - 12), t: 0, dur: 2.1, arc: 36, dmg: def.dmg * e.dmgMul });
      if (S.mode === 'day') sfx('launch');
      break;
    case 'tank':
      e.cd = 1 / def.rate; e.muzzle = 0.22;
      shootAtFront(e, 'shell', def.dmg * e.dmgMul);
      if (S.mode === 'day') sfx('boom');
      break;
    default: {
      e.cd = 1 / def.rate;
      damageFront(def.dmg * e.dmgMul);
      const p = P3(fx - 1, rand(6, 18), e.z);
      for (let i = 0; i < 4; i++) particle(p.x, p.y, rand(-50, 5) * p.k, rand(-70, -20) * p.k, debrisColor(), 0.45, rand(1.2, 2.4) * p.k, groundY(e.z));
      if (S.mode === 'day') sfx('thud');
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

function hit(e, dmg, head, px, py) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 0.12;
  if (e.type !== 'tank') e.kb = Math.min(3, e.kb + (head ? 2 : 1));
  const gy = groundY(e.z), k = F / e.z;
  const col = e.type === 'tank' ? PAL.metal : PAL.blood;
  for (let i = 0; i < (head ? 10 : 5); i++) particle(px, py, rand(-120, -10) * k * 0.6, rand(-110, 20) * k * 0.6, col, 0.55, rand(1, 2.2) * k, gy);
  if (head) floatText(px, py - 14, 'Tête !', PAL.blood, 17);
  if (e.hp <= 0) kill(e, head);
}

function kill(e, head, silent) {
  e.dead = true;
  if (!silent) {
    S.kills++; S.dayKills++;
    const g = geom(e);
    reward(e.def.reward + (head ? 2 : 0), (g.x0 + g.x1) / 2, g.y0 - 6);
  }
  S.corpses.push({ type: e.type, def: e.def, x: e.x, z: e.z, t: 0, walk: e.walk });
  if (e.type === 'tank') { const p = P3(e.x, 15, e.z); explode(p.x, p.y, 30 * p.k, true); }
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
    if (p.kind !== 'rocket' || p.dead) continue;
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
    const head = g.hr > 0 && Math.hypot(px - g.hx, py - g.hy) <= g.hr + (ws.auto ? 1 : 4);
    if (head || (px >= g.x0 - pad && px <= g.x1 + pad && py >= g.y0 - pad && py <= g.y1 + pad)) hits.push({ e, head });
  }
  hits.sort((a, b) => a.e.z - b.e.z);
  const n = Math.min(ws.pierce, hits.length);
  for (let i = 0; i < n; i++) hit(hits[i].e, ws.dmg * (hits[i].head ? 2.5 : 1), hits[i].head, px, py);
  if (n) S.fx.push({ kind: 'hitmark', x: px, y: py, t: 0, life: 0.18 });
  else if (py > HOR + 4) {
    const k = (py - HOR) / CAM_H;
    for (let i = 0; i < (ws.auto ? 2 : 6); i++) particle(px, py, rand(-40, 40) * k, rand(-90, -30) * k, `rgba(${PAL.dust.join(',')},0.7)`, 0.5, rand(1, 2) * k, py + 1);
  }
  if (w.ammo <= 0) startReload();
}

// ---------------------------------------------------------------------------
// Alliés aux fenêtres
// ---------------------------------------------------------------------------
const allyPos = i => ({ x: BX0 - 1, y: i * FH + 16, z: ALLY_Z });

function updateAlly(a, i, dt) {
  const def = ALLY[a.type];
  a.cd -= dt; a.flash = Math.max(0, a.flash - dt);
  if (a.cd > 0) return;
  let target = null;
  for (const e of S.enemies) {
    if (e.dead || e.demo || e.x < visLeftX(e.z) || BX0 - e.x > def.range) continue;
    if (!target || e.x > target.x) target = e;
  }
  if (!target) { a.cd = 0.2; return; }
  const w = allyPos(i), m = P3(w.x - 10, w.y, w.z);
  a.cd = def.interval; a.flash = 0.06;
  const g = geom(target);
  if (a.type === 'sniper') {
    const head = g.hr > 0 && Math.random() < def.head;
    const tx = head ? g.hx : (g.x0 + g.x1) / 2, ty = head ? g.hy : (g.y0 * 0.4 + g.y1 * 0.6);
    hit(target, def.dmg * (head ? 2.5 : 1), head, tx, ty);
    tracer(m.x, m.y, tx, ty, 0.12, 1.6);
    sfx('ally');
  } else {
    const tx = target.x + target.def.speed * 0.4;
    const dist = Math.hypot(tx - w.x, w.y, target.z - w.z);
    S.proj.push({ kind: 'ally', x0: w.x - 10, y0: w.y, z0: w.z, x1: tx, y1: 0, z1: target.z, t: 0, dur: dist / 330, arc: 18, dmg: def.dmg, splash: def.splash });
    sfx('launch');
  }
}

// Chaque tireur tire une balle toutes les 5 s sur un ennemi visible, et touche toujours
let lastShooterSfx = 0;
function updateShooters(dt) {
  if (!S.shooters.length) return;
  const targets = S.enemies.filter(e => !e.dead && !e.demo && e.x > visLeftX(e.z) + 5);
  for (let i = 0; i < S.shooters.length; i++) {
    S.shooters[i] -= dt;
    if (S.shooters[i] > 0) continue;
    if (!targets.length) { S.shooters[i] = 0.3; continue; }
    S.shooters[i] = SHOOTER.interval;
    const e = targets[Math.random() * targets.length | 0];
    if (e.dead) continue;
    const g = geom(e);
    const tx = rand(g.x0 + (g.x1 - g.x0) * 0.25, g.x1 - (g.x1 - g.x0) * 0.25), ty = rand(g.y0 + (g.y1 - g.y0) * 0.2, g.y1 - (g.y1 - g.y0) * 0.3);
    // Le coup part d'une fenêtre au hasard : on voit l'éclair, pas le tireur
    const floor = Math.random() * S.bld.floors | 0;
    const m = P3(BX0 - 1, floor * FH + 18, Math.random() < 0.5 ? ALLY_Z : DECO_Z);
    S.fx.push({ kind: 'flash', x: m.x, y: m.y, t: 0, life: 0.08, r: 2.6 * m.k * 0.6 });
    tracer(m.x, m.y, tx, ty, 0.07, 1.1);
    hit(e, SHOOTER.dmg, false, tx, ty);
    if (S.t - lastShooterSfx > 0.12) { sfx('ally'); lastShooterSfx = S.t; }
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
  if (p.kind === 'rocket' || p.kind === 'ally') {
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
  } else if (p.kind === 'ally') {
    explode(q.x, q.y, p.splash * 0.5 * q.k, true);
    for (const e of S.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x1, (e.z - p.z1) * 0.6);
      if (d < p.splash) { const g = geom(e); hit(e, p.dmg * (1 - d / (p.splash * 1.6)), false, (g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2); }
    }
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
  for (const c of S.corpses) c.t += dt;
  S.corpses = S.corpses.filter(c => c.t < (c.type === 'tank' ? 7 : 4));
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
    if (S.demoT <= 0 && S.enemies.length < 7) { spawn(['sword', 'sword', 'gunner', 'rider'][Math.random() * 4 | 0], true); S.demoT = rand(0.8, 1.8); }
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
  while (S.queue.length && S.queue[0].t <= S.dayT) spawn(S.queue.shift().type);

  const w = S.w, ws = weaponStats();
  w.cd = Math.max(0, w.cd - dt);
  if (w.reloading > 0) { w.reloading -= dt; if (w.reloading <= 0) { w.reloading = 0; w.ammo = ws.mag; } }
  if (ws.auto && pointer.down && w.cd <= 0) fire(pointer.x, pointer.y);

  for (const e of S.enemies) if (!e.dead) updateEnemy(e, dt);
  S.allies.forEach((a, i) => updateAlly(a, i, dt));
  updateShooters(dt);
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
  drawProjectiles();
  drawFx();
  drawTexts();
  if (S.mode === 'night') { ctx.fillStyle = 'rgba(10,14,40,0.35)'; ctx.fillRect(L, T, Rr - L, B - T); }
  drawVignette(L, Rr, T, B);
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
  const ratio = S.wall.hp / wallMax(lvl);
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
  S.allies.forEach((a, i) => drawAlly(a, i));
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

function drawAlly(a, i) {
  const w = allyPos(i);
  const head = P3(w.x + 2, w.y + 7, w.z), k = head.k * 0.6;
  ctx.fillStyle = PAL.paper ? INK_DARK : '#e9c9a0';
  ctx.beginPath(); ctx.arc(head.x, head.y, 3.2 * k, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PAL.ally; ctx.beginPath(); ctx.arc(head.x, head.y - 0.6 * k, 3.6 * k, Math.PI, 0); ctx.fill();
  const g0 = P3(w.x + 2, w.y + 3, w.z), g1 = P3(w.x - (a.type === 'sniper' ? 14 : a.type === 'rocket' ? 9 : 10), w.y + (a.type === 'rocket' ? 5 : 3), w.z);
  ctx.strokeStyle = a.type === 'rocket' ? PAL.allyRocket === PAPER_BG ? INK : PAL.allyRocket : PAL.gun;
  ctx.lineWidth = (a.type === 'rocket' ? 3.2 : a.type === 'mg' ? 2.2 : 1.6) * k;
  ctx.beginPath(); ctx.moveTo(g0.x, g0.y); ctx.lineTo(g1.x, g1.y); ctx.stroke();
  if (a.flash > 0) { ctx.fillStyle = PAL.flash; ctx.beginPath(); ctx.arc(g1.x, g1.y, 3.5 * k, 0, Math.PI * 2); ctx.fill(); }
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

function drawEnemy(e) {
  if (e.type === 'tank') {
    drawShadow(e.x, e.z, 36);
    ctx.save();
    if (e.flash > 0) ctx.filter = 'brightness(1.6)';
    drawTank(e, e.x, e.z, false);
    ctx.restore();
  } else {
    drawShadow(e.x, e.z, e.type === 'rider' ? 18 : 8 * e.def.s);
    const p = P3(e.x, 0, e.z), u = p.k * U * e.def.s;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.scale(u, u);
    const col = e.flash > 0 ? PAL.blood : PAL.stick;
    ctx.lineWidth = e.type === 'brute' ? 3.4 : 2.6;
    if (e.type === 'rider') drawHorse(e, e.walk, col);
    else drawStick(e.type, e, e.walk, col, PAL.team && PAL.team[e.type]);
    ctx.restore();
  }
  if (e.hp < e.max && !e.demo) {
    const g = geom(e);
    const w = Math.max(22, (g.x1 - g.x0) * 0.8), cx = (g.x0 + g.x1) / 2;
    ctx.fillStyle = PAL.barBg; ctx.fillRect(cx - w / 2, g.y0 - 9, w, 4);
    ctx.fillStyle = PAL.blood; ctx.fillRect(cx - w / 2, g.y0 - 9, w * clamp(e.hp / e.max, 0, 1), 4);
  }
}

function drawCorpse(c) {
  const life = c.type === 'tank' ? 7 : 4;
  const alpha = clamp((life - c.t) / 0.8, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (c.type === 'tank') {
    drawTank(null, c.x, c.z, true);
    if (Math.random() < 0.25) { const p = P3(c.x, 26, c.z); particle(p.x, p.y, rand(-8, 8), rand(-50, -25), `rgba(${PAL.smoke.join(',')},0.35)`, 1.5, rand(3, 7), 9999, -10); }
    ctx.restore();
    return;
  }
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
  else drawStick(c.type, null, 0, PAL.stick, PAL.team && PAL.team[c.type]);
  ctx.restore();
}

function drawProjectiles() {
  for (const p of S.proj) {
    const q = projPos(p);
    if (p.kind === 'bullet') {
      const n = projPos({ ...p, t: Math.max(0, p.t - 0.03) });
      ctx.strokeStyle = PAL.tracer; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(n.x, n.y); ctx.stroke();
    } else if (p.kind === 'shell') {
      ctx.fillStyle = PAL.line; ctx.beginPath(); ctx.arc(q.x, q.y, 2.2 * q.k, 0, Math.PI * 2); ctx.fill();
    } else {
      const n = projPos({ ...p, t: p.t + 0.02 });
      const a = Math.atan2(n.y - q.y, n.x - q.x), s = q.k * 0.6;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(a); ctx.scale(s, s);
      ctx.fillStyle = p.kind === 'rocket' ? PAL.rocket : PAL.allyRocket;
      ctx.strokeStyle = PAL.line; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-9, -3); ctx.lineTo(5, -3); ctx.lineTo(10, 0); ctx.lineTo(5, 3); ctx.lineTo(-9, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PAL.flash; ctx.beginPath(); ctx.arc(-11, 0, 2.5 + Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (p.kind === 'rocket') {
        ctx.strokeStyle = PAL.reticle; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.4; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.arc(q.x, q.y, 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
    }
  }
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
  const key = [S.day, S.money, S.w.ammo, S.w.reloading > 0, S.w.tier, Math.round(p * 50)].join('|');
  if (key === hudCache) return;
  hudCache = key;
  $('hudDay').textContent = `Jour ${S.day}`;
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
const freeFloor = () => S.allies.length < S.bld.floors;

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
      desc: () => '+300 PV et une fenêtre de plus pour un tireur.',
      cost: () => Math.round(320 * Math.pow(1.85, S.bld.floors - 1)), lock: () => S.bld.floors >= MAX_FLOORS ? 'Max' : null,
      buy: () => { S.bld.floors++; S.bld.hp += 300; } },
  ] },
  { group: 'Tireurs', items: [
    { id: 'shooter', name: () => 'Tireur', multi: 10,
      desc: () => `Caché dans la maison, il tire une balle toutes les 5 s et touche à chaque fois. Achète-en autant que tu veux. ${S.shooters.length} en poste.`,
      cost: () => SHOOTER.cost, lock: () => null,
      buy: () => { S.shooters.push(rand(0, SHOOTER.interval)); } },
    ...Object.entries(ALLY).map(([type, a]) => ({
    id: 'ally-' + type, name: () => a.name,
    desc: () => `${a.desc} ${S.allies.filter(x => x.type === type).length} en poste.`,
    cost: () => a.cost,
    lock: () => a.unlock && S.day < a.unlock ? `Dès la nuit ${a.unlock}` : !freeFloor() ? 'Construis un étage' : null,
    buy: () => { S.allies.push({ type, cd: 0.5, flash: 0 }); } })),
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
      if (it.multi) {
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
if (location.hash === '#debug') window.sniper = { state: () => S, endDay, startDay, newGame, geom, P3 };

function showBest() { $('best').textContent = best > 0 ? `Record : ${best} jour${best > 1 ? 's' : ''} tenu${best > 1 ? 's' : ''}` : ''; }
setStyle(style);
syncSound();
showBest();
resize();
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();
