// Simulation d'équilibrage de Sniper : reprend les formules de game.js.
// Un joueur "optimal" dépense chaque nuit 85 % de son argent dans ce qui donne
// le plus de dégâts par seconde par dollar (15 % gardés pour les réparations).
// Usage : node tools/balance.js [actuel|prix|final] [--json]
const ENEMY = {
  sword:{hp:40,r:5}, gunner:{hp:65,r:9}, rider:{hp:90,r:13}, brute:{hp:280,r:24}, bazooka:{hp:75,r:17},
  tank:{hp:1200,r:95}, shield:{hp:90,r:12}, dynamite:{hp:45,r:14}, crawler:{hp:18,r:3}, medic:{hp:60,r:15},
  drone:{hp:50,r:12}, arachnid:{hp:350,r:45}, mortar:{hp:70,r:18}, heli:{hp:600,r:70},
  walker:{hp:3000,r:400}, worm:{hp:4000,r:500}, queen:{hp:6000,r:700},
};
const SCEN = process.argv[2] || 'final';
const FIXED = SCEN === 'actuel';           // prix fixes (avant)
const FIXES = SCEN === 'final';            // fusil d'assaut à 45 + « Dégâts » sans limite
const PRICES = FIXED
  ? { shooter:[80,0], sniper:[250,0], rocket:[600,0] }
  : { shooter:[60,6], sniper:[500,30], rocket:[900,70] };
const SQ = { shooter:{dps:5, floor:1}, sniper:{dps:80*(0.65+0.35*2.5)/5, floor:2}, rocket:{dps:160/7*2.5, floor:3} };
const WEAP = [ // dps théorique réaliste (précision, têtes, perforation)
  {dmg:45, cyc:5*0.7+1.8, shots:5, acc:0.75*1.3, cost:0},
  {dmg:95, cyc:6*0.8+1.8, shots:6, acc:0.75*1.3*1.3, cost:450},
  {dmg:FIXES?45:26, cyc:30*0.11+1.9, shots:30, acc:0.6, cost:1100},
  {dmg:22, cyc:200*0.04+3.2, shots:200, acc:0.55, cost:2600},
];
function playerDps(w){ const b=WEAP[w.tier]; const interval=(b.cyc-1.8)/b.shots; // approx
  const per = b.shots*(interval/(1+0.12*w.rate)) + (b.cyc - b.shots*interval)/(1+0.18*w.rel);
  return b.dmg*(1+0.22*w.dmg)*b.shots/per*b.acc; }
function day(d){
  const counts = { sword:5+d*3, gunner:d>=2?2+(d-2)*2:0, rider:d>=4?2+(d-4)*2:0, brute:d>=5?1+Math.floor((d-5)*0.7):0,
    bazooka:d>=6?1+(d-6):0, shield:d>=7?1+Math.floor((d-7)*0.8):0, tank:d>=8?1+Math.floor((d-8)/2):0,
    dynamite:d>=9?1+Math.floor((d-9)*0.6):0, medic:d>=12?1+Math.floor((d-12)*0.3):0, drone:d>=13?1+Math.floor((d-13)*0.6):0,
    arachnid:d>=15?1+Math.floor((d-15)*0.35):0, mortar:d>=17?1+Math.floor((d-17)*0.3):0, heli:d>=18?1+Math.floor((d-18)*0.2):0 };
  let groups = d>=11?1+Math.floor((d-11)*0.4):0; const gs=8;
  const boss = d>=10 && d%10===0;
  if (boss){ for(const k in counts) counts[k]=Math.ceil(counts[k]*0.5); groups=Math.ceil(groups*0.5); }
  const total = Object.values(counts).reduce((a,b)=>a+b,0)+groups*gs;
  const f=Math.min(1,150/total);
  if(f<1){ for(const k in counts) if(counts[k]) counts[k]=Math.max(1,Math.round(counts[k]*f)); groups=Math.max(1,Math.round(groups*f)); }
  counts.crawler=groups*gs;
  const hpBoost=1/Math.sqrt(f), elite = d>=25?Math.min(0.45,(d-24)*0.012)+(1-f)*0.3:0;
  const mul=1+0.07*(d-1);
  let hp=0, reward=0, shieldHp=0, flyHp=0, n=0;
  for(const [k,c] of Object.entries(counts)){ const h=c*ENEMY[k].hp*mul*hpBoost*(1+2*elite); hp+=h; n+=c;
    reward+=c*ENEMY[k].r*(1+3*elite); if(k==='shield') shieldHp+=h; if(k==='drone'||k==='heli') flyHp+=h; }
  let bossHp=0, bossName='';
  if(boss){ const i=(d/10-1)%3, rank=Math.floor((d/10-1)/3)+1, t=['walker','worm','queen'][i]; bossName=t+(rank>1?' '+rank:'');
    let bh=ENEMY[t].hp*mul*(1+0.6*(rank-1)); if(t==='walker') bh*=1.6; // jambes (2×30 %) + cabine
    if(t==='worm') bh/=0.57; // seulement touchable ~57 % du temps
    bossHp=bh; hp+=bh; reward+=ENEMY[t].r*rank; if(rank>=2) {hp+= (t==='walker'?350:t==='worm'?4000:3000)*mul; } }
  const len=Math.min(25+d*5,100);
  const nMut=Math.max(0,Math.floor((d-1)/10)-2);
  return {d,n,hp,reward,shieldHp,flyHp,bossHp,bossName,len,nMut,bonus:40+15*d};
}
// Joueur "optimal" : chaque nuit, dépense tout pour le meilleur gain de dps par $
const st={money:0, floors:1, sq:{shooter:0,sniper:0,rocket:0}, w:{tier:0,dmg:0,rate:0,rel:0}};
const price=(t)=>PRICES[t][0]+PRICES[t][1]*st.sq[t];
function squadDps(D, armorC){ const s=D.shieldHp/D.hp, fly=D.flyHp/D.hp;
  const tHit=Math.max(6.25,25-6*armorC)/25;
  return (st.sq.shooter*SQ.shooter.dps*tHit*(1-s+s*0.15) + st.sq.sniper*SQ.sniper.dps + st.sq.rocket*SQ.rocket.dps)*(1-fly); }
const rows=[];
for(let d=1; d<=90; d++){
  const D=day(d), armorC=D.nMut/6;
  const pd=playerDps(st.w), sd=squadDps(D,armorC), need=D.hp/D.len;
  rows.push({d, ennemis:D.n, pvTotal:Math.round(D.hp), besoinDps:Math.round(need), joueur:Math.round(pd), escouade:Math.round(sd),
    marge:+( (pd+sd)/need ).toFixed(2), partJoueur:Math.round(100*pd/(pd+sd))+'%', gain:Math.round(D.reward+D.bonus),
    T:st.sq.shooter, S:st.sq.sniper, R:st.sq.rocket, arme:['sniper','lourd','assaut','minigun'][st.w.tier]+'+'+st.w.dmg, boss:D.bossName});
  st.money += D.reward + D.bonus;
  st.money *= 0.85; // ~15 % pour les réparations
  for(let guard=0; guard<2000; guard++){
    const opts=[];
    const D2=day(d+1);
    const base=playerDps(st.w)+squadDps(D2,armorC);
    for(const t of ['shooter','sniper','rocket']) if(st.floors>=SQ[t].floor){ st.sq[t]++; const g=playerDps(st.w)+squadDps(D2,armorC)-base; st.sq[t]--; opts.push({c:price(t)+0, g, a:()=>st.sq[t]++, p:price(t)}); }
    const wopt=(key,cost,max)=>{ if(st.w[key]>=max) return; st.w[key]++; const g=playerDps(st.w)+squadDps(D2,armorC)-base; st.w[key]--; opts.push({p:cost,g,a:()=>st.w[key]++}); };
    wopt('dmg',Math.round(90*Math.pow(FIXES?1.3:1.55,st.w.dmg)),FIXES?999:10); wopt('rate',Math.round(110*Math.pow(1.55,st.w.rate)),8); wopt('rel',Math.round(70*Math.pow(1.5,st.w.rel)),6);
    if(st.w.tier<3){ st.w.tier++; const g=playerDps(st.w)+squadDps(D2,armorC)-base; st.w.tier--; opts.push({p:WEAP[st.w.tier+1].cost,g,a:()=>st.w.tier++}); }
    if(st.floors<3){ opts.push({p:Math.round(320*Math.pow(1.85,st.floors-1)), g: st.floors===1? 24*0.9 : 57*0.9, a:()=>st.floors++}); }
    const ok=opts.filter(o=>o.p<=st.money && o.g>0).sort((a,b)=>b.g/b.p-a.g/a.p);
    if(!ok.length) break;
    st.money-=ok[0].p; ok[0].a();
  }
}
if (process.argv.includes('--json')) console.log(JSON.stringify(rows));
else console.table(rows.filter(r=>[1,2,3,5,7,10,12,15,18,20,25,30,35,40,45,50,60,70,80,90].includes(r.d)));
