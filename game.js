(() => {
'use strict';

// ---------------------------------------------------------------------------
// Monde (coordonnées logiques 960 x 540, mises à l'échelle à l'écran)
// ---------------------------------------------------------------------------
const W = 960, H = 540, GROUND = 455;
const WALL_X = 690;
const BLD_X = 772, BLD_W = 140, FLOOR_H = 60, MAX_FLOORS = 5;
const C = {
  paper: '#f4f6f8', grid: 'rgba(64,104,184,0.11)', ink: '#22409a', inkDark: '#172347',
  red: '#c62f3a', gold: '#a86f0b', faint: 'rgba(34,64,154,0.28)',
};
const FONT = '"Kalam", "Comic Sans MS", cursive';
const FONT_D = '"Caveat Brush", "Kalam", "Comic Sans MS", cursive';

const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function seeded(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Données de jeu
// ---------------------------------------------------------------------------
const ENEMY = {
  sword:   { name: 'Épéiste',         hp: 40,   speed: 44,  melee: true, dmg: 7,  rate: 1.0,  reward: 5,  s: 1,   half: 10 },
  gunner:  { name: 'Mitrailleur',     hp: 65,   speed: 34,  range: [150, 290], dmg: 2.4, pause: 1.7, reward: 9, s: 1, half: 10 },
  rider:   { name: 'Cavalier',        hp: 90,   speed: 125, melee: true, dmg: 12, rate: 0.9,  reward: 13, s: 1,   half: 30 },
  brute:   { name: 'Colosse',         hp: 280,  speed: 24,  melee: true, dmg: 30, rate: 0.55, reward: 24, s: 1.5, half: 15 },
  bazooka: { name: 'Lance-roquettes', hp: 75,   speed: 30,  range: [300, 420], dmg: 45, rate: 0.22, reward: 17, s: 1, half: 10 },
  tank:    { name: 'Tank',            hp: 1200, speed: 16,  range: [330, 400], dmg: 80, rate: 0.17, reward: 95, s: 1, half: 58 },
};

const DAY_NEWS = {
  1: 'Des épéistes viennent frapper le mur.',
  2: 'Des mitrailleurs arrivent. Ils tirent à distance.',
  4: 'Cavaliers : très rapides, ils foncent sur le mur.',
  5: 'Colosses : lents, mais très résistants.',
  6: 'Lance-roquettes : leurs tirs passent par-dessus le mur.',
  8: 'Les tanks entrent en scène.',
};

const WEAPONS = [
  { name: 'Fusil de sniper', dmg: 45, auto: false, interval: 0.7,  mag: 5,   reload: 1.8, spread: 0,  pierce: 1, cost: 0,
    desc: '' },
  { name: 'Sniper lourd',    dmg: 95, auto: false, interval: 0.8,  mag: 6,   reload: 1.8, spread: 0,  pierce: 3, cost: 450,
    desc: 'Dégâts doublés, la balle traverse 3 ennemis.' },
  { name: "Fusil d'assaut",  dmg: 26, auto: true,  interval: 0.11, mag: 30,  reload: 1.9, spread: 13, pierce: 1, cost: 1100,
    desc: 'Tir automatique : garde le doigt appuyé.' },
  { name: 'Minigun',         dmg: 22, auto: true,  interval: 0.04, mag: 200, reload: 3.2, spread: 20, pierce: 1, cost: 2600,
    desc: 'Le dernier recours. 25 balles par seconde.' },
];

const ALLY = {
  mg:     { name: 'Mitrailleur', cost: 160, interval: 0.13, dmg: 6,   range: 470, acc: 0.7,
            desc: 'Arrose les ennemis proches du mur.' },
  sniper: { name: 'Sniper',      cost: 280, interval: 1.7,  dmg: 75,  range: 2000, head: 0.3,
            desc: 'Tir lent et puissant, portée infinie.' },
  rocket: { name: 'Lance-roquettes', cost: 750, interval: 3.0, dmg: 150, range: 620, splash: 75, unlock: 5,
            desc: 'Dégâts de zone. Idéal contre les groupes et les tanks.' },
};

const WALL_NAMES = ['Palissade', 'Mur de briques', 'Mur de pierre', 'Rempart', 'Béton', 'Béton armé'];
const wallMax = lvl => 220 + lvl * 240;
const wallH = lvl => 64 + lvl * 12;
const bldMax = f => 320 + (f - 1) * 300;

// ---------------------------------------------------------------------------
// État
// ---------------------------------------------------------------------------
let S = makeState('title');
let best = 0;
try { best = +localStorage.getItem('sniper.best') || 0; } catch (e) { /* stockage indisponible */ }

function makeState(mode) {
  const st = {
    mode, day: 0, money: 0, kills: 0, t: 0,
    wall: { lvl: 0, hp: wallMax(0) }, bld: { floors: 1, hp: bldMax(1) },
    w: { tier: 0, dmg: 0, rate: 0, reload: 0, ammo: WEAPONS[0].mag, reloading: 0, cd: 0 },
    allies: [], enemies: [], proj: [], fx: [], texts: [], corpses: [],
    queue: [], total: 0, dayT: 0, dayLen: 1, dayKills: 0, dayMoney: 0, endTimer: 0,
    banner: null, shake: 0, aim: Math.PI, dyingT: 0, recoil: 0,
  };
  return st;
}

function weaponStats() {
  const b = WEAPONS[S.w.tier];
  return {
    ...b,
    dmg: b.dmg * (1 + 0.22 * S.w.dmg),
    interval: b.interval / (1 + 0.12 * S.w.rate),
    reload: b.reload / (1 + 0.18 * S.w.reload),
  };
}

const roofY = () => GROUND - S.bld.floors * FLOOR_H;
const pivot = () => ({ x: BLD_X + 14, y: roofY() - 9 });
const muzzle = () => { const p = pivot(); return { x: p.x + Math.cos(S.aim) * 30, y: p.y + Math.sin(S.aim) * 30 }; };
const wallAlive = () => S.wall.hp > 0;
const frontX = () => wallAlive() ? WALL_X : BLD_X;
const windowPos = i => ({ x: BLD_X + 8, y: GROUND - (i + 1) * FLOOR_H + 30 });

// ---------------------------------------------------------------------------
// Déroulement : jours et nuits
// ---------------------------------------------------------------------------
function newGame() {
  S = makeState('day');
  hideAll();
  $('hud').hidden = false; $('weapon').hidden = false;
  startDay();
}

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
  const ws = weaponStats();
  S.w.ammo = ws.mag; S.w.reloading = 0; S.w.cd = 0;
  S.banner = { title: `Jour ${d}`, sub: DAY_NEWS[d] || 'Ils sont toujours plus nombreux.', t: 0 };
  hideAll();
  $('hud').hidden = false; $('weapon').hidden = false;
}

function endDay() {
  S.mode = 'night';
  pointer.down = false;
  const bonus = 40 + S.day * 15;
  S.money += bonus;
  if (S.day > best) { best = S.day; try { localStorage.setItem('sniper.best', best); } catch (e) { /* ignore */ } }
  $('shopTitle').textContent = `Nuit ${S.day}`;
  $('shopRecap').textContent =
    `Jour ${S.day} tenu. ${S.dayKills} ennemis abattus, ${S.dayMoney} $ gagnés, prime de nuit +${bonus} $.`;
  $('btnNext').textContent = `Commencer le jour ${S.day + 1}`;
  renderShop();
  $('shopWrap').hidden = false;
}

function gameOver() {
  S.mode = 'over';
  pointer.down = false;
  const held = S.day - 1, rec = Math.max(best, held);
  $('overText').textContent =
    `Tu as tenu ${held} jour${held > 1 ? 's' : ''} et abattu ${S.kills} ennemis. Record : ${rec} jour${rec > 1 ? 's' : ''}.`;
  $('over').hidden = false;
  $('weapon').hidden = true;
}

function hideAll() {
  for (const id of ['title', 'pause', 'shopWrap', 'over']) $(id).hidden = true;
}

// ---------------------------------------------------------------------------
// Ennemis
// ---------------------------------------------------------------------------
function spawn(type) {
  const def = ENEMY[type];
  const mul = 1 + 0.07 * (S.day - 1);
  S.enemies.push({
    type, def, x: rand(-70, -25), hp: def.hp * mul, max: def.hp * mul,
    cd: rand(0.2, 1), walk: rand(0, 6), flash: 0, swing: 0, muzzle: 0,
    jit: rand(0, 18), range: def.range ? rand(def.range[0], def.range[1]) : 0, burst: 5,
    dmgMul: 1 + 0.04 * (S.day - 1),
  });
}

function geom(e) {
  const x = e.x, y = GROUND, s = e.def.s;
  if (e.type === 'tank') return { x0: x - 58, y0: y - 62, x1: x + 62, y1: y, hr: 0 };
  if (e.type === 'rider') return { x0: x - 32, y0: y - 70, x1: x + 34, y1: y, hx: x + 3, hy: y - 66, hr: 6 };
  return { x0: x - 11 * s, y0: y - 51 * s, x1: x + 11 * s, y1: y, hx: x + s, hy: y - 44 * s, hr: 6.5 * s };
}

function updateEnemy(e, dt) {
  const def = e.def;
  const fx = frontX();
  const stopX = def.melee ? fx - def.half - e.jit : fx - e.range;
  e.flash = Math.max(0, e.flash - dt);
  e.swing = Math.max(0, e.swing - dt * 3.3);
  e.muzzle = Math.max(0, e.muzzle - dt);
  if (e.x < stopX - 0.5) {
    e.x = Math.min(stopX, e.x + def.speed * dt);
    e.walk += dt * def.speed * 0.13;
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
        shootAtFront(e.x + 22, GROUND - 33, 'bullet', def.dmg * e.dmgMul);
      } else { e.burst = 4 + (Math.random() * 3 | 0); e.cd = def.pause; }
      break;
    case 'bazooka': {
      e.cd = 1 / def.rate; e.muzzle = 0.15;
      const tx = BLD_X + rand(4, 30), ty = GROUND - rand(15, S.bld.floors * FLOOR_H - 10);
      S.proj.push({ kind: 'rocket', x0: e.x + 18, y0: GROUND - 44, x1: tx, y1: ty, t: 0, dur: 2.0, arc: 70, dmg: def.dmg * e.dmgMul });
      sfx('launch');
      break;
    }
    case 'tank':
      e.cd = 1 / def.rate; e.muzzle = 0.2;
      shootAtFront(e.x + 64, GROUND - 46, 'shell', def.dmg * e.dmgMul);
      sfx('boom');
      break;
    default:
      e.cd = 1 / def.rate; e.swing = 1;
      damageFront(def.dmg * e.dmgMul);
      for (let i = 0; i < 3; i++) particle(fx - 2, GROUND - rand(8, 40), rand(-60, 10), rand(-80, -20), C.inkDark, 0.4);
  }
}

function shootAtFront(x0, y0, kind, dmg) {
  let x1, y1;
  if (wallAlive()) { x1 = WALL_X; y1 = GROUND - rand(8, wallH(S.wall.lvl) - 4); }
  else { x1 = BLD_X; y1 = GROUND - rand(10, S.bld.floors * FLOOR_H - 8); }
  const dist = Math.hypot(x1 - x0, y1 - y0);
  S.proj.push({ kind, x0, y0, x1, y1, t: 0, dur: dist / (kind === 'shell' ? 700 : 1100), arc: 0, dmg });
}

function damageFront(d) {
  if (wallAlive()) {
    S.wall.hp -= d;
    if (S.wall.hp <= 0) {
      S.wall.hp = 0;
      for (let i = 0; i < 24; i++) particle(WALL_X + rand(-4, 20), GROUND - rand(0, wallH(S.wall.lvl)), rand(-120, 120), rand(-200, -40), C.ink, 1.2, 3);
      floatText(WALL_X, GROUND - 110, 'Le mur est tombé !', C.red, 22);
      S.shake = 8;
      sfx('boom');
    }
  } else damageBld(d);
}

function damageBld(d) {
  if (S.mode !== 'day') return;
  S.bld.hp -= d;
  S.shake = Math.max(S.shake, Math.min(10, d / 6));
  if (S.bld.hp <= 0) {
    S.bld.hp = 0;
    S.mode = 'dying'; S.dyingT = 0;
    pointer.down = false;
  }
}

function hit(e, dmg, head, px, py) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 0.12;
  const n = head ? 9 : 4;
  for (let i = 0; i < n; i++) particle(px, py, rand(10, 140), rand(-120, 40), C.red, 0.5, rand(1.5, 3));
  if (head) floatText(px, py - 16, 'Tête !', C.red, 18);
  if (e.hp <= 0) kill(e, head);
}

function kill(e, head) {
  e.dead = true;
  S.kills++; S.dayKills++;
  reward(e.def.reward + (head ? 2 : 0), e.x, GROUND - 70);
  S.corpses.push({ type: e.type, def: e.def, x: e.x, t: 0, walk: e.walk });
  if (e.type === 'tank') { explode(e.x, GROUND - 30, 60, true); explode(e.x + 30, GROUND - 40, 40, false); }
}

function reward(n, x, y, label) {
  S.money += n; S.dayMoney += n;
  floatText(x, y, label ? `${label} +${n} $` : `+${n} $`, C.gold, 16);
}

// ---------------------------------------------------------------------------
// Joueur
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
  const pv = pivot();
  S.aim = Math.atan2(py - pv.y, px - pv.x);
  S.recoil = ws.auto ? 0.35 : 1;
  const m = muzzle();
  sfx(ws.auto ? 'auto' : 'shot');

  // Roquettes en vol : on peut les abattre
  for (const p of S.proj) {
    if (p.kind !== 'rocket' || p.dead) continue;
    const q = projPos(p);
    if (Math.hypot(q.x - px, q.y - py) < (ws.auto ? 16 : 26)) {
      p.dead = true;
      explode(q.x, q.y, 26, false);
      reward(4, q.x, q.y - 14, 'Interceptée');
      tracer(m.x, m.y, q.x, q.y, 0.14, 1.6);
      if (w.ammo <= 0) startReload();
      return;
    }
  }

  const pad = ws.auto ? 3 : 10;
  const hits = [];
  for (const e of S.enemies) {
    if (e.dead) continue;
    const g = geom(e);
    const head = g.hr > 0 && Math.hypot(px - g.hx, py - g.hy) <= g.hr + (ws.auto ? 1 : 4);
    if (head || (px >= g.x0 - pad && px <= g.x1 + pad && py >= g.y0 - pad && py <= g.y1 + pad)) hits.push({ e, head });
  }
  hits.sort((a, b) => b.e.x - a.e.x);
  const n = Math.min(ws.pierce, hits.length);
  for (let i = 0; i < n; i++) hit(hits[i].e, ws.dmg * (hits[i].head ? 2.5 : 1), hits[i].head, px, py);
  tracer(m.x, m.y, px, py, ws.auto ? 0.06 : 0.16, ws.auto ? 1 : 1.6);
  if (!n && py > GROUND - 8 && py < GROUND + 30) {
    for (let i = 0; i < 4; i++) particle(px, GROUND, rand(-50, 50), rand(-90, -30), C.faint, 0.4, 2);
  }
  if (w.ammo <= 0) startReload();
}

// ---------------------------------------------------------------------------
// Alliés dans le bâtiment
// ---------------------------------------------------------------------------
function updateAlly(a, i, dt) {
  const def = ALLY[a.type];
  a.cd -= dt; a.flash = Math.max(0, a.flash - dt);
  if (a.cd > 0) return;
  let target = null;
  for (const e of S.enemies) {
    if (e.dead || e.x < -10 || e.x > BLD_X || BLD_X - e.x > def.range) continue;
    if (!target || e.x > target.x) target = e;
  }
  if (!target) { a.cd = 0.2; return; }
  const p = windowPos(i);
  a.cd = def.interval; a.flash = 0.06;
  const g = geom(target);
  if (a.type === 'mg') {
    const tx = rand(g.x0, g.x1), ty = rand(g.y0, g.y1);
    if (Math.random() < def.acc) hit(target, def.dmg, false, tx, ty);
    tracer(p.x - 6, p.y, tx + rand(-10, 10), ty + rand(-8, 8), 0.05, 0.8);
  } else if (a.type === 'sniper') {
    const head = g.hr > 0 && Math.random() < def.head;
    const tx = head ? g.hx : (g.x0 + g.x1) / 2, ty = head ? g.hy : (g.y0 + g.y1) / 2;
    hit(target, def.dmg * (head ? 2.5 : 1), head, tx, ty);
    tracer(p.x - 6, p.y, tx, ty, 0.12, 1.3);
    sfx('ally');
  } else {
    const tx = target.x + target.def.speed * 0.5, ty = GROUND - 18;
    const dist = Math.hypot(tx - p.x, ty - p.y);
    S.proj.push({ kind: 'ally', x0: p.x - 8, y0: p.y, x1: tx, y1: ty, t: 0, dur: dist / 520, arc: 30, dmg: def.dmg, splash: def.splash });
    sfx('launch');
  }
}

// ---------------------------------------------------------------------------
// Projectiles, effets
// ---------------------------------------------------------------------------
function projPos(p) {
  const t = clamp(p.t / p.dur, 0, 1);
  return { x: lerp(p.x0, p.x1, t), y: lerp(p.y0, p.y1, t) - p.arc * Math.sin(t * Math.PI), t };
}

function updateProj(p, dt) {
  p.t += dt;
  if (p.kind === 'rocket' || p.kind === 'ally') {
    const q = projPos(p);
    if (Math.random() < 0.7) particle(q.x, q.y, rand(-15, 15), rand(-25, 5), 'rgba(23,35,71,0.35)', 0.6, rand(2, 4));
  }
  if (p.t < p.dur) return;
  p.dead = true;
  const q = projPos(p);
  if (p.kind === 'bullet') {
    damageFront(p.dmg);
    particle(q.x, q.y, rand(-60, -10), rand(-60, 20), C.inkDark, 0.25, 1.5);
  } else if (p.kind === 'rocket') {
    explode(q.x, q.y, 34, true);
    damageBld(p.dmg);
  } else if (p.kind === 'shell') {
    explode(q.x, q.y, 40, true);
    damageFront(p.dmg);
  } else if (p.kind === 'ally') {
    explode(q.x, q.y, p.splash * 0.6, true);
    for (const e of S.enemies) {
      if (e.dead) continue;
      const d = Math.abs(e.x - q.x);
      if (d < p.splash) hit(e, p.dmg * (1 - d / (p.splash * 1.6)), false, e.x, GROUND - 25);
    }
  }
}

let lastBoom = 0;
function explode(x, y, r, loud) {
  S.fx.push({ kind: 'boom', x, y, r, t: 0, life: 0.45 });
  for (let i = 0; i < r / 3; i++) particle(x, y, rand(-r * 4, r * 4), rand(-r * 5, r), 'rgba(23,35,71,0.45)', rand(0.4, 0.9), rand(2, 5));
  if (loud && S.t - lastBoom > 0.08) { sfx('boom'); lastBoom = S.t; }
}

function particle(x, y, vx, vy, color, life, r = 2) {
  S.fx.push({ kind: 'p', x, y, vx, vy, color, t: 0, life, r });
}
function tracer(x1, y1, x2, y2, life, w) {
  S.fx.push({ kind: 'tracer', x1, y1, x2, y2, t: 0, life, w });
}
function floatText(x, y, txt, color, size) {
  S.texts.push({ x, y, txt, color, size, t: 0, life: 1.1 });
}

function updateFx(dt) {
  for (const f of S.fx) {
    f.t += dt;
    if (f.kind === 'p') { f.vy += 380 * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.y > GROUND + 2) { f.y = GROUND + 2; f.vx *= 0.5; f.vy *= -0.2; } }
  }
  S.fx = S.fx.filter(f => f.t < f.life);
  for (const t of S.texts) { t.t += dt; t.y -= 28 * dt; }
  S.texts = S.texts.filter(t => t.t < t.life);
  for (const c of S.corpses) c.t += dt;
  S.corpses = S.corpses.filter(c => c.t < (c.type === 'tank' ? 6 : 3.2));
  S.shake = Math.max(0, S.shake - dt * 25);
  S.recoil = Math.max(0, S.recoil - dt * 6);
  if (S.banner) { S.banner.t += dt; if (S.banner.t > 3.4) S.banner = null; }
}

// ---------------------------------------------------------------------------
// Boucle
// ---------------------------------------------------------------------------
function update(dt) {
  S.t += dt;
  updateFx(dt);

  if (S.mode === 'dying') {
    S.dyingT += dt;
    if (Math.random() < 0.35) explode(BLD_X + rand(0, BLD_W), GROUND - rand(0, S.bld.floors * FLOOR_H), rand(20, 50), true);
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
  for (const p of S.proj) if (!p.dead) updateProj(p, dt);
  S.enemies = S.enemies.filter(e => !e.dead);
  S.proj = S.proj.filter(p => !p.dead);

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

const R = seeded(7);
const HILLS = Array.from({ length: 14 }, (_, i) => ({ x: -120 + i * 85 + R() * 30, h: 14 + R() * 26, w: 70 + R() * 60 }));
const TUFTS = Array.from({ length: 40 }, () => ({ x: -200 + R() * 1300, h: 3 + R() * 5 }));
const CRACKS = Array.from({ length: MAX_FLOORS * 3 }, () => {
  const pts = []; let x = BLD_X + 15 + R() * (BLD_W - 30), y = R() * FLOOR_H;
  for (let k = 0; k < 4; k++) { pts.push([x, y]); x += (R() - 0.5) * 26; y += R() * 14; }
  return pts;
});

function render() {
  const cw = canvas.width, ch = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, cw, ch);

  // Quadrillage du papier
  const step = 24 * scale * dpr;
  const ox = (offX * dpr) % step, oy = (offY * dpr) % step;
  ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = ox; x < cw; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, ch); }
  for (let y = oy; y < ch; y += step) { ctx.moveTo(0, y); ctx.lineTo(cw, y); }
  ctx.stroke();

  const sh = S.shake;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (offX + rand(-sh, sh) * scale), dpr * (offY + rand(-sh, sh) * scale));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  drawBackdrop();
  drawWall();
  drawBuilding();
  for (const c of S.corpses) drawCorpse(c);
  for (const e of S.enemies) drawEnemy(e);
  drawProjectiles();
  drawFx();
  drawTexts();
  if (S.mode === 'night' || S.mode === 'title') drawNight();
  drawBanner();
  drawReticle();
}

function drawBackdrop() {
  const L = -offX / scale - 10, Rr = (canvas.width / dpr - offX) / scale + 10;
  // Soleil qui traverse le ciel pendant la journée
  if (S.mode === 'day' || S.mode === 'dying') {
    const p = clamp(S.dayT / S.dayLen, 0, 1);
    const sx = 90 + p * (W - 180), sy = 120 - Math.sin(p * Math.PI) * 60;
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx, sy, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = k / 10 * Math.PI * 2 + S.t * 0.2;
      ctx.moveTo(sx + Math.cos(a) * 21, sy + Math.sin(a) * 21); ctx.lineTo(sx + Math.cos(a) * 28, sy + Math.sin(a) * 28);
    }
    ctx.stroke();
  }
  // Collines à l'horizon
  ctx.strokeStyle = C.faint; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const h of HILLS) { ctx.moveTo(h.x - h.w / 2, GROUND - 40); ctx.quadraticCurveTo(h.x, GROUND - 40 - h.h * 2, h.x + h.w / 2, GROUND - 40); }
  ctx.stroke();
  // Sol
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(L, GROUND); ctx.lineTo(Rr, GROUND); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.strokeStyle = C.faint;
  ctx.beginPath();
  for (const t of TUFTS) { ctx.moveTo(t.x, GROUND); ctx.lineTo(t.x - 2, GROUND + t.h); ctx.moveTo(t.x + 4, GROUND); ctx.lineTo(t.x + 6, GROUND + t.h * 0.8); }
  for (let y = GROUND + 18; y < H + 60; y += 16) { ctx.moveTo(L, y); ctx.lineTo(Rr, y); }
  ctx.stroke();
  // Flèche d'arrivée (comme sur le croquis)
  ctx.strokeStyle = C.faint; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(10, GROUND - 110); ctx.lineTo(60, GROUND - 110); ctx.moveTo(50, GROUND - 117); ctx.lineTo(60, GROUND - 110); ctx.lineTo(50, GROUND - 103); ctx.stroke();
}

function hatch(x, y, w, h, gap, color) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = -h; k < w; k += gap) { ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); }
  ctx.stroke();
  ctx.restore();
}

function hpBar(x, y, w, ratio, color) {
  ctx.fillStyle = 'rgba(253,253,251,0.9)'; ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * clamp(ratio, 0, 1), 7);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.strokeRect(x, y, w, 7);
}

function drawWall() {
  const lvl = S.wall.lvl, h = wallH(lvl), wd = 14 + lvl * 2;
  const ratio = S.wall.hp / wallMax(lvl);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  if (S.wall.hp <= 0) {
    ctx.beginPath();
    ctx.moveTo(WALL_X - 10, GROUND); ctx.lineTo(WALL_X - 2, GROUND - 12); ctx.lineTo(WALL_X + 6, GROUND - 7);
    ctx.lineTo(WALL_X + wd, GROUND - 16); ctx.lineTo(WALL_X + wd + 12, GROUND);
    ctx.stroke();
    return;
  }
  const top = GROUND - h;
  // Face + profondeur (petite perspective comme le croquis)
  ctx.beginPath();
  ctx.rect(WALL_X, top, wd, h);
  ctx.moveTo(WALL_X, top); ctx.lineTo(WALL_X + 8, top - 8); ctx.lineTo(WALL_X + wd + 8, top - 8); ctx.lineTo(WALL_X + wd, top);
  ctx.moveTo(WALL_X + wd + 8, top - 8); ctx.lineTo(WALL_X + wd + 8, GROUND - 8); ctx.lineTo(WALL_X + wd, GROUND);
  ctx.stroke();
  if (lvl === 0) {
    ctx.beginPath();
    for (let x = WALL_X + 4; x < WALL_X + wd; x += 5) { ctx.moveTo(x, top); ctx.lineTo(x, GROUND); }
    ctx.lineWidth = 1; ctx.stroke();
  } else {
    ctx.lineWidth = 1; ctx.strokeStyle = C.faint;
    ctx.beginPath();
    for (let y = top + 9, r = 0; y < GROUND; y += 9, r++) {
      ctx.moveTo(WALL_X, y); ctx.lineTo(WALL_X + wd, y);
      const off = r % 2 ? wd / 2 : wd / 4;
      ctx.moveTo(WALL_X + off, y - 9); ctx.lineTo(WALL_X + off, y);
    }
    ctx.stroke();
    if (lvl >= 3) hatch(WALL_X, top, wd, h, lvl >= 4 ? 4 : 7, C.faint);
  }
  // Fissures
  if (ratio < 0.66) {
    ctx.strokeStyle = C.inkDark; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(WALL_X + 2, top + h * 0.2); ctx.lineTo(WALL_X + wd * 0.6, top + h * 0.35); ctx.lineTo(WALL_X + 4, top + h * 0.5); ctx.stroke();
  }
  if (ratio < 0.33) {
    ctx.beginPath(); ctx.moveTo(WALL_X + wd, top + h * 0.55); ctx.lineTo(WALL_X + wd * 0.3, top + h * 0.7); ctx.lineTo(WALL_X + wd * 0.8, top + h * 0.9); ctx.stroke();
  }
  hpBar(WALL_X - 18, top - 22, 50, ratio, ratio > 0.35 ? C.ink : C.red);
}

function drawBuilding() {
  const f = S.bld.floors, top = roofY();
  const ratio = S.bld.hp / bldMax(f);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2;
  // Profondeur à droite
  ctx.beginPath();
  ctx.moveTo(BLD_X, top); ctx.lineTo(BLD_X + 16, top - 12); ctx.lineTo(BLD_X + BLD_W + 16, top - 12); ctx.lineTo(BLD_X + BLD_W, top);
  ctx.moveTo(BLD_X + BLD_W + 16, top - 12); ctx.lineTo(BLD_X + BLD_W + 16, GROUND - 12); ctx.lineTo(BLD_X + BLD_W, GROUND);
  ctx.stroke();
  hatch(BLD_X + BLD_W, top - 12, 16, GROUND - top + 12, 5, C.faint);
  for (let i = 0; i < f; i++) {
    const y = GROUND - (i + 1) * FLOOR_H;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2;
    ctx.strokeRect(BLD_X, y, BLD_W, FLOOR_H);
    ctx.lineWidth = 1.6;
    ctx.strokeRect(BLD_X + 8, y + 16, 34, 26);
    ctx.strokeRect(BLD_X + 74, y + 16, 26, 26);
    ctx.beginPath(); ctx.moveTo(BLD_X + 87, y + 16); ctx.lineTo(BLD_X + 87, y + 42); ctx.moveTo(BLD_X + 74, y + 29); ctx.lineTo(BLD_X + 100, y + 29); ctx.stroke();
    if (i === 0) { ctx.strokeRect(BLD_X + 112, y + 22, 18, 38); }
    // Fissures selon les dégâts
    const lost = 1 - ratio;
    ctx.strokeStyle = C.inkDark; ctx.lineWidth = 1.3;
    for (let k = 0; k < 3; k++) {
      if (lost < 0.2 + k * 0.25) continue;
      const pts = CRACKS[i * 3 + k];
      ctx.beginPath();
      pts.forEach(([px, py], j) => j ? ctx.lineTo(px, y + py) : ctx.moveTo(px, y + py));
      ctx.stroke();
    }
  }
  // Alliés aux fenêtres
  S.allies.forEach((a, i) => drawAlly(a, i));
  // Le sniper (joueur) allongé sur le toit
  drawPlayer(top);
  hpBar(BLD_X + 20, top - 40, 100, ratio, ratio > 0.35 ? C.ink : C.red);
}

function drawPlayer(top) {
  // Allongé sur le toit, tête côté gauche, arme pointée vers la visée
  const y = top - 4, hx = BLD_X + 26;
  ctx.strokeStyle = C.inkDark; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx, y - 8, 5, 0, Math.PI * 2);
  ctx.moveTo(hx + 5, y - 5); ctx.lineTo(hx + 34, y - 2);
  ctx.lineTo(hx + 46, y); ctx.moveTo(hx + 34, y - 2); ctx.lineTo(hx + 45, y - 6);
  ctx.moveTo(hx + 8, y - 4); ctx.lineTo(BLD_X + 10, y - 4);
  ctx.stroke();
  const ws = WEAPONS[S.w.tier], p = pivot();
  const a = S.aim, back = S.recoil * 4, len = 30 - back;
  ctx.lineWidth = S.w.tier === 3 ? 5.5 : S.w.tier === 2 ? 3.5 : 3;
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(p.x - Math.cos(a) * (10 + back), p.y - Math.sin(a) * (10 + back));
  ctx.lineTo(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len);
  ctx.stroke();
  if (S.recoil > 0.6 || (ws.auto && S.recoil > 0.2)) {
    const m = muzzle();
    ctx.fillStyle = C.gold;
    ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawAlly(a, i) {
  const p = windowPos(i);
  ctx.strokeStyle = C.inkDark; ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(p.x + 22, p.y - 6, 5, 0, Math.PI * 2);
  ctx.moveTo(p.x + 22, p.y - 1); ctx.lineTo(p.x + 22, p.y + 12);
  ctx.moveTo(p.x + 22, p.y + 3); ctx.lineTo(p.x + 8, p.y + 2);
  ctx.stroke();
  ctx.strokeStyle = C.ink;
  if (a.type === 'rocket') {
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(p.x + 30, p.y - 6); ctx.lineTo(p.x - 6, p.y - 2); ctx.stroke();
  } else {
    ctx.lineWidth = a.type === 'mg' ? 3.5 : 2.5;
    ctx.beginPath(); ctx.moveTo(p.x + 16, p.y + 2); ctx.lineTo(p.x - (a.type === 'sniper' ? 12 : 6), p.y + 1); ctx.stroke();
  }
  if (a.flash > 0) { ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(p.x - 9, p.y, 4, 0, Math.PI * 2); ctx.fill(); }
}

// --- Personnages (pieds en 0,0, tournés vers la droite) ---
function stick(s, walk) {
  const sw = Math.sin(walk) * 8 * s;
  ctx.beginPath();
  ctx.moveTo(sw, 0); ctx.lineTo(0, -20 * s); ctx.lineTo(-sw, 0);
  ctx.moveTo(0, -20 * s); ctx.lineTo(s, -38 * s);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(s, -44 * s, 6 * s, 0, Math.PI * 2); ctx.stroke();
}

function drawBody(type, s, walk, e) {
  const shY = -35 * s;
  const attacking = e && e.attacking;
  const wk = attacking ? 0 : walk;
  switch (type) {
    case 'sword':
    case 'brute': {
      stick(s, wk);
      const sw = e ? e.swing : 0;
      const ang = attacking ? lerp(-1.5, 0.7, 1 - sw) : -0.4 + Math.sin(walk) * 0.15;
      const hx = s + Math.cos(ang + 0.6) * 11 * s, hy = shY + Math.sin(ang + 0.6) * 11 * s;
      ctx.beginPath(); ctx.moveTo(s, shY); ctx.lineTo(hx, hy);
      ctx.moveTo(s, shY); ctx.lineTo(-7 * s, shY + 10 * s); ctx.stroke();
      ctx.lineWidth *= type === 'brute' ? 2.2 : 1;
      const len = type === 'brute' ? 16 * s : 20 * s;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(ang - 0.4) * len, hy + Math.sin(ang - 0.4) * len); ctx.stroke();
      if (type === 'sword') { ctx.beginPath(); ctx.moveTo(hx - 3, hy + 3); ctx.lineTo(hx + 3, hy - 3); ctx.stroke(); }
      break;
    }
    case 'gunner': {
      stick(s, wk);
      ctx.beginPath(); ctx.moveTo(s, shY); ctx.lineTo(10, shY + 6); ctx.lineTo(14, shY + 3); ctx.stroke();
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(2, shY + 3); ctx.lineTo(21, shY + 2); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, shY + 3); ctx.lineTo(9, shY + 10); ctx.stroke();
      if (e && e.muzzle > 0) { ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(25, shY + 2, 4, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'bazooka': {
      stick(s, wk);
      ctx.beginPath(); ctx.moveTo(s, shY); ctx.lineTo(8, shY - 2); ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-12, shY + 1); ctx.lineTo(18, shY - 8); ctx.stroke();
      if (e && e.muzzle > 0) { ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(22, shY - 9, 6, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'rider': {
      const lg = Math.sin(walk * 1.3) * 9;
      ctx.beginPath();
      ctx.moveTo(-22, -34); ctx.quadraticCurveTo(-2, -40, 18, -36);
      ctx.lineTo(26, -50); ctx.lineTo(35, -45);
      ctx.moveTo(-22, -34); ctx.lineTo(-31, -22);
      ctx.moveTo(14, -36); ctx.lineTo(14 + lg, 0); ctx.moveTo(10, -36); ctx.lineTo(10 - lg, 0);
      ctx.moveTo(-17, -35); ctx.lineTo(-17 - lg, 0); ctx.moveTo(-13, -36); ctx.lineTo(-13 + lg, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -39); ctx.lineTo(2, -58); ctx.moveTo(0, -39); ctx.lineTo(5, -28);
      ctx.moveTo(2, -55); ctx.lineTo(14, -52); ctx.lineTo(28, -64);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(3, -64, 5.5, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'tank': {
      ctx.beginPath();
      ctx.moveTo(-50, -16); ctx.lineTo(-56, -8); ctx.lineTo(-50, 0); ctx.lineTo(52, 0); ctx.lineTo(58, -8); ctx.lineTo(52, -16); ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      for (let k = -42; k <= 44; k += 17) { ctx.moveTo(k + 5, -8); ctx.arc(k, -8, 5, 0, Math.PI * 2); }
      ctx.moveTo(-50, -16); ctx.lineTo(-44, -36); ctx.lineTo(46, -36); ctx.lineTo(54, -16);
      ctx.stroke();
      hatch(-44, -36, 90, 20, 7, 'rgba(23,35,71,0.3)');
      ctx.strokeRect(-22, -52, 40, 16);
      ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(18, -45); ctx.lineTo(64, -47); ctx.stroke();
      if (e && e.muzzle > 0) { ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(68, -47, 8, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
  }
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, GROUND);
  const col = e.flash > 0 ? C.red : C.inkDark;
  ctx.strokeStyle = col; ctx.lineWidth = e.type === 'brute' ? 2.8 : 2;
  drawBody(e.type, e.def.s, e.walk, e);
  ctx.restore();
  if (e.hp < e.max) {
    const g = geom(e);
    const w = Math.max(24, (g.x1 - g.x0) * 0.8);
    ctx.fillStyle = 'rgba(253,253,251,0.9)'; ctx.fillRect(e.x - w / 2, g.y0 - 10, w, 4);
    ctx.fillStyle = C.red; ctx.fillRect(e.x - w / 2, g.y0 - 10, w * clamp(e.hp / e.max, 0, 1), 4);
  }
}

function drawCorpse(c) {
  const life = c.type === 'tank' ? 6 : 3.2;
  const fall = clamp(c.t / 0.3, 0, 1);
  ctx.save();
  ctx.globalAlpha = clamp((life - c.t) / 0.8, 0, 1) * 0.75;
  ctx.translate(c.x, GROUND);
  if (c.type !== 'tank') ctx.rotate(-fall * Math.PI / 2 * (c.type === 'rider' ? 0.5 : 1));
  ctx.strokeStyle = C.faint; ctx.lineWidth = 2;
  drawBody(c.type, c.def.s, c.walk, null);
  ctx.restore();
  if (c.type === 'tank' && Math.random() < 0.3) particle(c.x + rand(-20, 20), GROUND - 40, rand(-10, 10), rand(-70, -40), 'rgba(23,35,71,0.25)', 1, rand(3, 6));
}

function drawProjectiles() {
  for (const p of S.proj) {
    const q = projPos(p);
    if (p.kind === 'bullet') {
      const dx = p.x1 - p.x0, dy = p.y1 - p.y0, d = Math.hypot(dx, dy) || 1;
      ctx.strokeStyle = C.inkDark; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - dx / d * 8, q.y - dy / d * 8); ctx.stroke();
    } else if (p.kind === 'shell') {
      ctx.fillStyle = C.inkDark; ctx.beginPath(); ctx.arc(q.x, q.y, 3.5, 0, Math.PI * 2); ctx.fill();
    } else {
      const n = projPos({ ...p, t: p.t + 0.02 });
      const a = Math.atan2(n.y - q.y, n.x - q.x);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(a);
      ctx.strokeStyle = p.kind === 'rocket' ? C.red : C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-9, -3); ctx.lineTo(5, -3); ctx.lineTo(10, 0); ctx.lineTo(5, 3); ctx.lineTo(-9, 3); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, -3); ctx.lineTo(-13, -6); ctx.moveTo(-9, 3); ctx.lineTo(-13, 6); ctx.stroke();
      ctx.restore();
      if (p.kind === 'rocket') {
        // Repère pour la viser : cercle pointillé
        ctx.strokeStyle = 'rgba(198,47,58,0.45)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.arc(q.x, q.y, 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }
}

function drawFx() {
  for (const f of S.fx) {
    const k = 1 - f.t / f.life;
    if (f.kind === 'p') {
      ctx.fillStyle = f.color; ctx.globalAlpha = clamp(k * 1.5, 0, 1);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    } else if (f.kind === 'tracer') {
      ctx.globalAlpha = k; ctx.strokeStyle = C.gold; ctx.lineWidth = f.w;
      ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
    } else if (f.kind === 'boom') {
      const r = f.r * (0.5 + (1 - k) * 0.8);
      ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(168,111,11,0.35)'; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.red; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let j = 0; j < 12; j++) {
        const a = j / 12 * Math.PI * 2, rr = j % 2 ? r * 0.7 : r * 1.1;
        j ? ctx.lineTo(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr) : ctx.moveTo(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawTexts() {
  ctx.textAlign = 'center';
  for (const t of S.texts) {
    ctx.globalAlpha = clamp((t.life - t.t) / 0.4, 0, 1);
    ctx.font = `700 ${t.size}px ${FONT}`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(244,246,248,0.9)';
    ctx.strokeText(t.txt, t.x, t.y);
    ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawNight() {
  ctx.fillStyle = 'rgba(14,22,52,0.35)';
  ctx.fillRect(-offX / scale - 20, -offY / scale - 20, canvas.width / dpr / scale + 40, canvas.height / dpr / scale + 40);
  ctx.strokeStyle = '#fdfdfb'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(820, 90, 18, Math.PI * 0.6, Math.PI * 1.9); ctx.arc(812, 84, 15, Math.PI * 1.75, Math.PI * 0.7, true); ctx.stroke();
}

function drawBanner() {
  const b = S.banner;
  if (!b) return;
  const a = b.t < 0.3 ? b.t / 0.3 : clamp((3.4 - b.t) / 0.6, 0, 1);
  ctx.globalAlpha = a; ctx.textAlign = 'center';
  ctx.font = `64px ${FONT_D}`;
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(244,246,248,0.95)';
  ctx.strokeText(b.title, W / 2, 200); ctx.fillStyle = C.ink; ctx.fillText(b.title, W / 2, 200);
  ctx.font = `700 20px ${FONT}`;
  ctx.strokeText(b.sub, W / 2, 236); ctx.fillStyle = C.inkDark; ctx.fillText(b.sub, W / 2, 236);
  ctx.globalAlpha = 1;
}

function drawReticle() {
  if (S.mode !== 'day' || !(pointer.down || pointer.mouse)) return;
  const { x, y } = pointer;
  const r = WEAPONS[S.w.tier].auto ? 14 + WEAPONS[S.w.tier].spread * 0.5 : 13;
  ctx.strokeStyle = S.w.reloading > 0 ? C.faint : C.red; ctx.lineWidth = 1.6;
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
  $('hudMoney').textContent = `${S.money} $`;
  $('wName').textContent = ws.name;
  const am = $('wAmmo');
  if (S.w.reloading > 0) am.innerHTML = '<span>Rechargement…</span>';
  else if (ws.mag > 12) am.innerHTML = `<span>${S.w.ammo} / ${ws.mag}</span>`;
  else am.innerHTML = Array.from({ length: ws.mag }, (_, i) => `<i class="${i < S.w.ammo ? '' : 'empty'}"></i>`).join('');
}

// ---------------------------------------------------------------------------
// Boutique de nuit
// ---------------------------------------------------------------------------
function freeFloor() { return S.allies.length < S.bld.floors; }

const SHOP = [
  { group: 'Bâtiment', items: [
    { id: 'repairWall',
      name: () => S.wall.hp <= 0 ? 'Reconstruire le mur' : 'Réparer le mur',
      desc: () => `${WALL_NAMES[S.wall.lvl]} : ${Math.round(S.wall.hp)} / ${wallMax(S.wall.lvl)} PV. Répare autant que ton argent le permet.`,
      cost: () => Math.ceil((wallMax(S.wall.lvl) - S.wall.hp) * 0.45),
      lock: () => S.wall.hp >= wallMax(S.wall.lvl) ? 'Intact' : null,
      partial: true,
      buy: spent => { S.wall.hp = Math.min(wallMax(S.wall.lvl), S.wall.hp + spent / 0.45); } },
    { id: 'upWall',
      name: () => S.wall.lvl >= 5 ? 'Mur au maximum' : `Mur : ${WALL_NAMES[S.wall.lvl + 1]}`,
      desc: () => S.wall.lvl >= 5 ? 'Ton mur ne peut pas être plus solide.' : `PV max ${wallMax(S.wall.lvl)} → ${wallMax(S.wall.lvl + 1)}. Plus haut, plus épais.`,
      cost: () => Math.round(140 * Math.pow(1.7, S.wall.lvl)),
      lock: () => S.wall.lvl >= 5 ? 'Max' : null,
      buy: () => { S.wall.lvl++; S.wall.hp += wallMax(S.wall.lvl) - wallMax(S.wall.lvl - 1); } },
    { id: 'repairBld', name: () => 'Réparer le bâtiment',
      desc: () => `${Math.round(S.bld.hp)} / ${bldMax(S.bld.floors)} PV. Répare autant que ton argent le permet.`,
      cost: () => Math.ceil((bldMax(S.bld.floors) - S.bld.hp) * 0.55),
      lock: () => S.bld.hp >= bldMax(S.bld.floors) ? 'Intact' : null,
      partial: true,
      buy: spent => { S.bld.hp = Math.min(bldMax(S.bld.floors), S.bld.hp + spent / 0.55); } },
    { id: 'floor', name: () => S.bld.floors >= MAX_FLOORS ? '5 étages, maximum' : `Construire l'étage ${S.bld.floors + 1}`,
      desc: () => '+300 PV et une fenêtre de plus pour un tireur.',
      cost: () => Math.round(320 * Math.pow(1.85, S.bld.floors - 1)),
      lock: () => S.bld.floors >= MAX_FLOORS ? 'Max' : null,
      buy: () => { S.bld.floors++; S.bld.hp += 300; } },
  ] },
  { group: 'Tireurs', items: Object.entries(ALLY).map(([type, a]) => ({
    id: 'ally-' + type, name: () => a.name,
    desc: () => `${a.desc} ${S.allies.filter(x => x.type === type).length} en poste.`,
    cost: () => a.cost,
    lock: () => a.unlock && S.day < a.unlock ? `Dès la nuit ${a.unlock}` : !freeFloor() ? 'Construis un étage' : null,
    buy: () => { S.allies.push({ type, cd: 0.5, flash: 0 }); } })) },
  { group: 'Ton arme', items: [
    { id: 'dmg', name: () => `Dégâts (niv. ${S.w.dmg}/10)`, desc: () => '+22 % de dégâts par balle.',
      cost: () => Math.round(90 * Math.pow(1.55, S.w.dmg)), lock: () => S.w.dmg >= 10 ? 'Max' : null, buy: () => { S.w.dmg++; } },
    { id: 'rate', name: () => `Cadence (niv. ${S.w.rate}/8)`, desc: () => '+12 % de tirs par seconde.',
      cost: () => Math.round(110 * Math.pow(1.55, S.w.rate)), lock: () => S.w.rate >= 8 ? 'Max' : null, buy: () => { S.w.rate++; } },
    { id: 'reload', name: () => `Rechargement (niv. ${S.w.reload}/6)`, desc: () => 'Recharge 18 % plus vite.',
      cost: () => Math.round(70 * Math.pow(1.5, S.w.reload)), lock: () => S.w.reload >= 6 ? 'Max' : null, buy: () => { S.w.reload++; } },
    { id: 'evolve',
      name: () => S.w.tier >= 3 ? 'Minigun : arme ultime' : `Passer au ${WEAPONS[S.w.tier + 1].name}`,
      desc: () => S.w.tier >= 3 ? 'Tu as l\'arme la plus puissante.' : WEAPONS[S.w.tier + 1].desc,
      cost: () => S.w.tier >= 3 ? 0 : WEAPONS[S.w.tier + 1].cost,
      lock: () => S.w.tier >= 3 ? 'Max' : null,
      buy: () => { S.w.tier++; S.w.ammo = weaponStats().mag; } },
  ] },
];

function renderShop() {
  $('shopMoney').textContent = `${S.money} $`;
  const root = $('shopGroups');
  root.innerHTML = '';
  for (const g of SHOP) {
    const sec = document.createElement('section');
    sec.innerHTML = `<h3 class="group-title">${g.group}</h3>`;
    const cards = document.createElement('div');
    cards.className = 'cards';
    for (const it of g.items) {
      const lock = it.lock();
      const cost = it.cost();
      const affordable = it.partial ? S.money > 0 : S.money >= cost;
      const card = document.createElement('div');
      card.className = 'card' + (lock ? ' locked' : '');
      const label = lock || (it.partial && S.money < cost ? `Réparer pour ${S.money} $` : `${cost} $`);
      card.innerHTML = `<div class="name"></div><div class="desc"></div><button id="buy-${it.id}"></button>`;
      card.querySelector('.name').textContent = it.name();
      card.querySelector('.desc').textContent = it.desc();
      const btn = card.querySelector('button');
      btn.textContent = label;
      btn.disabled = !!lock || !affordable;
      btn.addEventListener('click', () => {
        if (it.lock()) return;
        const c = it.cost();
        if (it.partial) { const spent = Math.min(c, S.money); if (spent <= 0) return; S.money -= spent; it.buy(spent); }
        else { if (S.money < c) return; S.money -= c; it.buy(); }
        sfx('cash');
        renderShop();
      });
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
  shot: { f: 2600, d: 0.25, g: 0.32 }, auto: { f: 1700, d: 0.06, g: 0.1 }, ally: { f: 1900, d: 0.15, g: 0.1 },
  boom: { f: 420, d: 0.7, g: 0.45 }, launch: { f: 900, d: 0.35, g: 0.12 }, reload: { f: 4000, d: 0.04, g: 0.06 },
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
  newGame();
});
$('btnRetry').addEventListener('click', newGame);
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
if (location.hash === '#debug') window.sniper = { state: () => S, endDay, startDay, newGame };

syncSound();
if (best > 0) $('best').textContent = `Record : ${best} jour${best > 1 ? 's' : ''} tenu${best > 1 ? 's' : ''}`;
resize();
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();
