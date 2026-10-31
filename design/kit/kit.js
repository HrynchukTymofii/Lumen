/* Lumen design kit: landscape illustrations, the Light, icons, doodles, Bible text.
   In the product: scenes become pre-rendered SVG assets (app/assets/scenes, website/public/scenes),
   the Light becomes components/Light.tsx (react-native-svg + Reanimated). */
(function(){
const K = window.Kit = {};
K.NAME = 'Lumen';
K.esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ───────── seeded random ───────── */
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let uid = 0;

/* ───────── scene parts ───────── */
function ridge(r,base,amp,n,smooth){
  const step=440/n;const pts=[];
  for(let i=0;i<=n;i++){const x=-20+i*step+(r()-.5)*step*.35;const peak=i%2===0;const y=base-(peak?amp*(.45+.55*r()):amp*(.05+.25*r()));pts.push([x,y])}
  let d=`M-20 300 L${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  if(smooth){for(let i=1;i<pts.length;i++){const p=pts[i-1],q=pts[i];const mx=(p[0]+q[0])/2;d+=` C${mx.toFixed(1)} ${p[1].toFixed(1)} ${mx.toFixed(1)} ${q[1].toFixed(1)} ${q[0].toFixed(1)} ${q[1].toFixed(1)}`}}
  else pts.slice(1).forEach(p=>d+=` L${p[0].toFixed(1)} ${p[1].toFixed(1)}`);
  return d+' L420 300 Z';
}
function pine(x,y,h){const w=h*.34;return `M${x} ${y-h}L${x+w*.62} ${y-h*.55}L${x+w*.34} ${y-h*.55}L${x+w*.86} ${y-h*.2}L${x+w*.46} ${y-h*.2}L${x+w} ${y}L${x-w} ${y}L${x-w*.46} ${y-h*.2}L${x-w*.86} ${y-h*.2}L${x-w*.34} ${y-h*.55}L${x-w*.62} ${y-h*.55}Z`}
function trees(r,{y,count,hmin,hmax,x0=-10,x1=410,c}){let d='';for(let i=0;i<count;i++){const x=x0+(x1-x0)*(i+r()*.8)/count;const h=hmin+(hmax-hmin)*r();d+=pine(x.toFixed(1)*1,y+r()*6,h)}return `<path d="${d}" fill="${c}"/>`}
function cloud(x,y,s,c,o){return `<g fill="${c}" opacity="${o}"><ellipse cx="${x}" cy="${y}" rx="${28*s}" ry="${9*s}"/><ellipse cx="${x-10*s}" cy="${y-6*s}" rx="${14*s}" ry="${10*s}"/><ellipse cx="${x+9*s}" cy="${y-8*s}" rx="${16*s}" ry="${12*s}"/></g>`}

/* scene palettes: each one a mood used across the app */
const SCENES = {
  dawn:   {seed:11,sky:['#FCE3C4','#F7B98C'],sun:{x:150,y:120,r:34,c:'#FFF4D8',halo:'#FFE1A8'},clouds:[[300,60,1.1,'#FFF1DF',.8],[70,48,.8,'#FFF1DF',.6]],
           layers:[{c:'#EDA57B',base:178,amp:70,n:7},{c:'#C97A5E',base:205,amp:62,n:6},{c:'#8D5850',base:228,amp:30,n:9,smooth:1,trees:{count:16,hmin:18,hmax:36,c:'#6A403E'}}],
           water:{y:232,c:['#F4B585','#E9956A'],glint:'#FFE7C2'},front:'#4E302F'},
  golden: {seed:5,sky:['#FBD78A','#F4A24E'],sun:{x:120,y:118,r:42,c:'#FFEAA0',halo:'#FFD36E'},
           layers:[{c:'#D98C52',base:168,amp:85,n:5},{c:'#A4644A',base:196,amp:70,n:6},{c:'#6E4639',base:222,amp:26,n:10,smooth:1,trees:{count:20,hmin:14,hmax:30,c:'#4E3029'}}],
           water:{y:226,c:['#F0A048','#D97C2E'],glint:'#FFE08A'},front:'#3E2723'},
  lake:   {seed:3,sky:['#D5F0E6','#9FD8C9'],sun:{x:280,y:86,r:26,c:'#F6FFF7',halo:'#E2F7EC'},clouds:[[110,70,1,'#EFFBF6',.8]],
           layers:[{c:'#93CDBE',base:160,amp:64,n:7},{c:'#5FA597',base:188,amp:52,n:6},{c:'#2F6F67',base:206,amp:22,n:9,smooth:1,trees:{count:22,hmin:16,hmax:34,c:'#1F504B'}}],
           water:{y:208,c:['#4C9C92','#2E746D'],glint:'#D8F3EA'},front:'#1C3F3B'},
  meadow: {seed:21,sky:['#EEF5DD','#D3E8BF'],sun:{x:300,y:78,r:28,c:'#FFFBE6',halo:'#FFF1BC'},clouds:[[120,64,1.2,'#FFFFFF',.9]],
           layers:[{c:'#B6D69C',base:176,amp:46,n:5,smooth:1},{c:'#8DBE78',base:204,amp:40,n:5,smooth:1,trees:{count:6,hmin:20,hmax:34,c:'#3D6E48',x0:240,x1:400}},{c:'#5E9A5F',base:240,amp:30,n:4,smooth:1}],
           river:'#9ED0DE',front:'#3F7148'},
  dusk:   {seed:8,sky:['#FCE1DA','#EFB3B8'],sun:{x:240,y:128,r:36,c:'#FFF0E6',halo:'#FFD3CC'},clouds:[[90,72,1,'#FFF1EE',.75]],
           layers:[{c:'#DFA3AE',base:172,amp:72,n:6},{c:'#B07B94',base:200,amp:60,n:7},{c:'#735274',base:222,amp:24,n:9,smooth:1,trees:{count:18,hmin:14,hmax:30,c:'#4F3854'}}],
           water:{y:226,c:['#CF94A8','#A86F8C'],glint:'#FFE3E6'},front:'#3F2C44'},
  evening:{seed:14,sky:['#E9DEF7','#BFA9E6'],sun:{x:300,y:90,r:22,c:'#FFF8EE',halo:'#F2E6FF',moon:1},stars:14,
           layers:[{c:'#AE98DA',base:170,amp:76,n:6},{c:'#806BB4',base:198,amp:60,n:7},{c:'#4F4384',base:220,amp:22,n:9,smooth:1,trees:{count:18,hmin:14,hmax:30,c:'#372E63'}}],
           water:{y:222,c:['#8F7BC4','#61529C'],glint:'#F3EBFF'},front:'#2C2552'},
  night:  {seed:2,sky:['#2E3160','#4D4683'],sun:{x:90,y:80,r:20,c:'#FFF6DA',halo:'#7C74B8',moon:1},stars:34,
           layers:[{c:'#433F78',base:176,amp:70,n:6},{c:'#302D5C',base:204,amp:54,n:7},{c:'#1F1D40',base:224,amp:20,n:10,smooth:1,trees:{count:22,hmin:14,hmax:30,c:'#15142E'}}],
           water:{y:228,c:['#363670','#232350'],glint:'#FFF3C4'},front:'#121128'},
  sky:    {seed:30,sky:['#E2F1FA','#B8DCEE'],sun:{x:90,y:76,r:26,c:'#FFFFFF',halo:'#EAF6FD'},clouds:[[250,58,1.3,'#FFFFFF',.95],[340,96,.8,'#FFFFFF',.8]],
           layers:[{c:'#A3C9DD',base:168,amp:80,n:5,snow:1},{c:'#6F9FBC',base:198,amp:58,n:6},{c:'#3F6E8A',base:226,amp:24,n:9,smooth:1,trees:{count:18,hmin:16,hmax:32,c:'#2B5068'}}],
           water:{y:230,c:['#7FB3CF','#5A91B2'],glint:'#F1FAFF'},front:'#24435A'}
};
/* palette versions of the main sunrise: the scene used most (Today, welcome, landing hero) */
SCENES.dawnBlue = {seed:11,sky:['#D9E4F4','#F5DCAE'],sun:{x:150,y:120,r:34,c:'#FFF4D2',halo:'#FFE3A0'},clouds:[[300,60,1.1,'#F4F7FC',.85],[70,48,.8,'#F4F7FC',.6]],
  layers:[{c:'#A7B8DA',base:178,amp:70,n:7},{c:'#7286B6',base:205,amp:62,n:6},{c:'#41517F',base:228,amp:30,n:9,smooth:1,trees:{count:16,hmin:18,hmax:36,c:'#2C3963'}}],
  water:{y:232,c:['#8DA2CC','#5D729E'],glint:'#FFE9B0'},front:'#1E2847'};
SCENES.dawnGreen = {seed:11,sky:['#F5F0DA','#E9D9A0'],sun:{x:150,y:120,r:34,c:'#FFF7DC',halo:'#F6E3A0'},clouds:[[300,60,1.1,'#FFFBEA',.85],[70,48,.8,'#FFFBEA',.6]],
  layers:[{c:'#B7C390',base:178,amp:70,n:7},{c:'#879A5C',base:205,amp:62,n:6},{c:'#56693A',base:228,amp:30,n:9,smooth:1,trees:{count:16,hmin:18,hmax:36,c:'#3A4A2A'}}],
  water:{y:232,c:['#A7B788','#7A8C59'],glint:'#FFF4CF'},front:'#2C3820'};
const REMAP = {easter:{dawn:'dawnBlue'}, olive:{dawn:'dawnGreen'}};
K.SCENE_NAMES = Object.keys(SCENES).filter(n=>!/Blue|Green/.test(n));

K.scene = function(name, opts={}){
  name = (REMAP[document.documentElement.dataset.palette]||{})[name] || name;
  const S = SCENES[name] || SCENES.dawn; const r = rng(S.seed + (opts.seed||0)); const id = 'sc'+(++uid);
  let o = `<svg class="scene" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${S.sky[0]}"/><stop offset="1" stop-color="${S.sky[1]}"/></linearGradient>
    ${S.water?`<linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${S.water.c[0]}"/><stop offset="1" stop-color="${S.water.c[1]}"/></linearGradient>`:''}
  </defs><rect width="400" height="300" fill="url(#${id}s)"/>`;
  if(S.stars){for(let i=0;i<S.stars;i++){o+=`<circle cx="${(r()*400).toFixed(0)}" cy="${(r()*130).toFixed(0)}" r="${(.6+r()*1.2).toFixed(1)}" fill="#FFF7DE" opacity="${(.4+r()*.6).toFixed(2)}"/>`}}
  const s = S.sun; if(s && !opts.noSun){
    o += `<circle cx="${s.x}" cy="${s.y}" r="${s.r*2.1}" fill="${s.halo}" opacity=".35"/><circle cx="${s.x}" cy="${s.y}" r="${s.r*1.45}" fill="${s.halo}" opacity=".45"/><circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${s.c}"/>`;
    if(s.moon) o += `<circle cx="${s.x+s.r*.42}" cy="${s.y-s.r*.28}" r="${s.r*.86}" fill="${S.sky[0]}"/>`;
  }
  (S.clouds||[]).forEach(c=>o+=cloud(...c));
  S.layers.forEach(L=>{
    o += `<path d="${ridge(r,L.base,L.amp,L.n,L.smooth)}" fill="${L.c}"/>`;
    if(L.trees) o += trees(r,{y:L.base+4,...L.trees});
  });
  if(S.river){o+=`<path d="M175 300 C 200 270, 150 258, 205 240 S 260 222, 238 210" fill="none" stroke="${S.river}" stroke-width="16" stroke-linecap="round"/><path d="M175 300 C 200 270, 150 258, 205 240" fill="none" stroke="#fff" stroke-width="2" opacity=".5" stroke-dasharray="10 14"/>`}
  if(S.water){
    const w=S.water;o+=`<rect y="${w.y}" width="400" height="${300-w.y}" fill="url(#${id}w)"/>`;
    for(let i=0;i<9;i++){const y=w.y+6+i*((300-w.y)/9);o+=`<rect x="${(r()*320).toFixed(0)}" y="${y.toFixed(1)}" width="${(30+r()*90).toFixed(0)}" height="2.2" rx="1.1" fill="${w.glint}" opacity="${(.25+r()*.3).toFixed(2)}"/>`}
    if(s&&!opts.noSun){for(let i=0;i<6;i++){const wd=s.r*(1.4-i*.18);o+=`<rect x="${(s.x-wd/2+(r()-.5)*8).toFixed(1)}" y="${(w.y+5+i*9).toFixed(1)}" width="${wd.toFixed(1)}" height="3.2" rx="1.6" fill="${w.glint}" opacity="${(.75-i*.1).toFixed(2)}"/>`}}
  }
  if(S.front && !opts.noFront){
    o+=`<path d="M-10 300 L-10 262 C 30 250, 60 258, 90 270 C 110 278, 130 290, 150 300 Z" fill="${S.front}"/><path d="M410 300 L410 255 C 380 250, 350 262, 330 278 C 320 286, 312 294, 305 300 Z" fill="${S.front}"/>`;
    let g='';for(let i=0;i<14;i++){const x=(i<7?-4+i*12:312+(i-7)*14)+r()*6;const h=10+r()*16;g+=`M${x.toFixed(1)} ${300-(i<7?28-i*3:30-(i-7)*3)}q${(r()*6-3).toFixed(1)} ${-h*.6} ${(r()*8-4).toFixed(1)} ${-h}`}
    o+=`<path d="${g}" stroke="${S.front}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    if(!opts.noBigTrees){let t='';[[18,262,74],[44,270,52],[384,258,66]].forEach(([x,y,h])=>t+=pine(x,y,h*(.85+r()*.3)));o+=`<path d="${t}" fill="${S.front}"/>`}
  }
  return o+'</svg>';
};
K.art = (name, cls='', style='', opts) => `<div class="art ${cls}" style="${style}">${K.scene(name, opts)}</div>`;

/* ───────── the Light ───────── */
K.light = function(size=96, state='idle'){
  const id='lg'+(++uid);
  let rays='';for(let i=0;i<12;i++){const a=i*30*Math.PI/180;rays+=`<line x1="${(50+Math.cos(a)*40).toFixed(1)}" y1="${(50+Math.sin(a)*40).toFixed(1)}" x2="${(50+Math.cos(a)*48).toFixed(1)}" y2="${(50+Math.sin(a)*48).toFixed(1)}"/>`}
  return `<span class="light" style="--s:${size}px" data-state="${state}" role="img" aria-label="${K.NAME}"><svg viewBox="0 0 100 100"><defs><radialGradient id="${id}" cx=".4" cy=".36" r=".72"><stop offset="0" stop-color="#FFE9B0"/><stop offset=".7" stop-color="#FFD58A"/><stop offset="1" stop-color="#F8BC74"/></radialGradient></defs>
    <circle class="halo" cx="50" cy="50" r="47" fill="#FFD98C" opacity=".22"/>
    <circle class="ripple" cx="50" cy="50" r="36" fill="none" stroke="#F5AE6C" stroke-width="1.6"/><circle class="ripple r2" cx="50" cy="50" r="36" fill="none" stroke="#F5AE6C" stroke-width="1.6"/><circle class="ripple r3" cx="50" cy="50" r="36" fill="none" stroke="#F5AE6C" stroke-width="1.6"/>
    <g class="rays" style="stroke:var(--rays,#F29A4A)" stroke-width="3.2" stroke-linecap="round">${rays}</g>
    <circle class="orbit" cx="50" cy="50" r="39.5" fill="none" style="stroke:var(--orbit,#F2B29A)" stroke-width="2.2" stroke-dasharray="15 9" stroke-linecap="round"/>
    <circle class="core" cx="50" cy="50" r="29" fill="url(#${id})"/>
    <circle cx="50" cy="50" r="19" fill="#FFF1C9" opacity=".55"/></svg></span>`;
};
K.hydrate = root => (root||document).querySelectorAll('[data-light]').forEach(el=>{el.outerHTML=K.light(+el.dataset.light||96, el.dataset.state||'idle')});

/* ───────── icons (Lucide-style strokes) ───────── */
const ic = (d, s=20, w=2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
K.I = {
  back:s=>ic('<path d="M15 5l-7 7 7 7"/>',s||20,2.4), x:s=>ic('<path d="M6 6l12 12M18 6L6 18"/>',s||20,2.4),
  arrow:s=>ic('<path d="M5 12h14M13 6l6 6-6 6"/>',s||20,2.4), chev:s=>ic('<path d="M9 6l6 6-6 6"/>',s||18,2.2),
  heart:s=>ic('<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/>',s),
  share:s=>ic('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',s),
  timer:s=>ic('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>',s), download:s=>ic('<path d="M17.5 19a4.5 4.5 0 10-1.4-8.8A6 6 0 104 15"/><path d="M12 12v9M8.5 17.5L12 21l3.5-3.5"/>',s),
  play:s=>`<svg width="${s||20}" height="${s||20}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 001.5.9l10.6-6.8a1 1 0 000-1.8L9.5 4.3A1 1 0 008 5.2z"/></svg>`,
  pause:s=>`<svg width="${s||20}" height="${s||20}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1.5"/><rect x="14" y="4.5" width="4" height="15" rx="1.5"/></svg>`,
  lock:s=>ic('<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 018 0v3"/>',s||14,2.4),
  book:s=>ic('<path d="M2 4h6a4 4 0 014 4v13a3 3 0 00-3-3H2zM22 4h-6a4 4 0 00-4 4v13a3 3 0 013-3h7z"/>',s),
  check:s=>ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>',s||16,3),
  search:s=>ic('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',s||22,2.2), user:s=>ic('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M6.2 18.6a7 7 0 0111.6 0"/>',s||24,2),
  settings:s=>ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>',s),
  hourglass:s=>ic('<path d="M6 2h12M6 22h12M7 2c0 5 10 5 10 10S7 17 7 22M17 2c0 5-10 5-10 10s10 5 10 10"/>',s),
  plus:s=>ic('<path d="M12 5v14M5 12h14"/>',s||26,3), bell:s=>ic('<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/>',s),
  send:s=>ic('<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',s||20,2.2), mic:s=>ic('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v4"/>',s),
  sparkle:s=>ic('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',s), filter:s=>ic('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',s||22),
  headphones:s=>ic('<path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1v-6h3zM3 19a2 2 0 002 2h1v-6H3z"/>',s),
  note:s=>ic('<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',s),
  calendar:s=>ic('<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',s), clock:s=>ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',s||16),
  /* tab icons */
  tToday:s=>ic('<path d="M12 3v3M4.6 8.6l2 1.4M19.4 8.6l-2 1.4M2 18h20M7 18a5 5 0 0110 0M5 22h14"/>',s||24,1.9),
  tPray:s=>ic('<path d="M4 19V6a2 2 0 012-2h11v13H6a2 2 0 00-2 2zm0 0a2 2 0 002 2h13V7"/><path d="M10.5 7.5v6M8 10h5"/>',s||24,1.9),
  tChat:s=>ic('<path d="M21 11.5a8.4 8.4 0 01-12.2 7.5L3 21l2-5.3A8.4 8.4 0 1121 11.5z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',s||24,2),
  tJourney:s=>ic('<path d="M3 21h18"/><path d="M6 17v-5M10 17V8M14 17v-3M18 17V5"/>',s||24,2)
};

/* ───────── ink doodles for pastel cards (SAT style) ───────── */
const ink='fill="none" stroke="#2B211C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
K.D = {
  book:()=>`<svg viewBox="0 0 160 120" ${ink} aria-hidden="true"><path d="M80 30c-16-10-40-12-62-6v74c22-6 46-4 62 6 16-10 40-12 62-6V24c-22-6-46-4-62 6z" fill="#FFF9F2"/><path d="M80 30v74"/><path d="M32 44c12-2 24-1 34 3M32 58c12-2 24-1 34 3M94 47c10-4 22-5 34-3M94 61c10-4 22-5 34-3" stroke-width="2"/><path d="M118 20v30l7-6 7 6V20" fill="#F2B29A"/></svg>`,
  candle:()=>`<svg viewBox="0 0 120 150" ${ink} aria-hidden="true"><path d="M60 18c10 12 10 24 0 30-10-6-10-18 0-30z" fill="#FDE3A2"/><path d="M60 36v-6"/><rect x="42" y="56" width="36" height="72" rx="6" fill="#FFF9F2"/><path d="M42 72c8 4 12-4 18 0s10 4 18 0"/><path d="M24 132h72" stroke-width="3"/><path d="M28 30l-8-4M92 30l8-4M24 48h-8M96 48h8" stroke-width="2"/></svg>`,
  dove:()=>`<svg viewBox="0 0 170 120" ${ink} aria-hidden="true"><path d="M30 70c20-2 34-14 46-32 6 22 2 40-12 52 26 4 52-6 70-26-2 30-30 50-64 48-18 0-30-8-40-18z" fill="#FFF9F2"/><path d="M76 38c8-14 22-20 36-18-8 8-12 18-12 30"/><circle cx="48" cy="66" r="2.2" fill="#2B211C"/><path d="M26 72l-10 2 8 4"/><path d="M120 92c8 8 18 12 30 12M128 84c10 2 18 0 26-6" stroke-width="2"/></svg>`,
  sunrise:()=>`<svg viewBox="0 0 180 120" ${ink} aria-hidden="true"><path d="M20 96h140"/><path d="M50 96a40 40 0 0180 0" fill="#FDE3A2"/><path d="M90 30v-14M48 46l-10-10M132 46l10-10M28 72H14M152 72h14" stroke-width="2.4"/><path d="M40 108h100" stroke-width="2"/></svg>`,
  path:()=>`<svg viewBox="0 0 180 130" ${ink} aria-hidden="true"><path d="M30 118c40-10 10-36 60-44s30-30 60-40" stroke-dasharray="2 9" stroke-width="3"/><circle cx="30" cy="118" r="8" fill="#FFF9F2"/><circle cx="90" cy="74" r="8" fill="#FDE3A2"/><path d="M150 34V10l18 7-18 7" fill="#F2B29A"/></svg>`
};

/* ───────── Bible text (World English Bible, public domain). In the product it comes from the DB. ───────── */
K.VERSES = {
  phil4:{ref:'Philippians 4:6–7',v:[[6,'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.'],[7,'And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.']]},
  '1pet5':{ref:'1 Peter 5:7',v:[[7,'casting all your worries on him, because he cares for you.']]},
  matt11:{ref:'Matthew 11:28',v:[[28,'Come to me, all you who labor and are heavily burdened, and I will give you rest.']]},
  ps34:{ref:'Psalm 34:18',v:[[18,'Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.']]},
  lam3:{ref:'Lamentations 3:22–23',v:[[22,"It is because of Yahweh's loving kindnesses that we are not consumed, because his mercies don't fail."],[23,'They are new every morning. Great is your faithfulness.']]},
  ps5:{ref:'Psalm 5:3',v:[[3,'Yahweh, in the morning you will hear my voice. In the morning I will lay my requests before you, and will watch expectantly.']]},
  ps119:{ref:'Psalm 119:105',v:[[105,'Your word is a lamp to my feet, and a light for my path.']]},
  prov3:{ref:'Proverbs 3:5–6',v:[[5,"Trust in Yahweh with all your heart, and don't lean on your own understanding."],[6,'In all your ways acknowledge him, and he will make your paths straight.']]},
  john14:{ref:'John 14:27',v:[[27,"Peace I leave with you. My peace I give to you; not as the world gives, I give to you. Don't let your heart be troubled, neither let it be fearful."]]},
  ps4:{ref:'Psalm 4:8',v:[[8,'In peace I will both lay myself down and sleep, for you, Yahweh alone, make me live in safety.']]},
  ps23:{ref:'Psalm 23:1–3',v:[[1,'Yahweh is my shepherd: I shall lack nothing.'],[2,'He makes me lie down in green pastures. He leads me beside still waters.'],[3,'He restores my soul. He guides me in the paths of righteousness for his name’s sake.']]}
};
K.chip = k => `<button class="vchip" data-verse="${k}">${K.I.book(14)}${K.VERSES[k].ref}</button>`;
K.verseHTML = k => { const v=K.VERSES[k]; return v.v.map(([n,t])=>`<sup>${n}</sup>${K.esc(t)}`).join(' '); };

/* ───────── theme ───────── */
K.initTheme = function(seg, onChange){
  const set = t => { document.documentElement.dataset.theme=t; seg && seg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.t===t)); try{localStorage.setItem('lumen-theme',t)}catch(e){} onChange&&onChange(t); };
  seg && seg.addEventListener('click', e=>{const b=e.target.closest('button[data-t]'); if(b) set(b.dataset.t)});
  let t=null; try{t=localStorage.getItem('lumen-theme')}catch(e){}
  set(t || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
};
/* palettes: dawn (peach), easter (navy + gold), olive (green + gold) */
K.initPalette = function(seg, onChange){
  const set = (p, user) => { document.documentElement.dataset.palette=p; seg && seg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.pal===p)); try{localStorage.setItem('lumen-palette',p)}catch(e){} user&&onChange&&onChange(p); };
  seg && seg.addEventListener('click', e=>{const b=e.target.closest('button[data-pal]'); if(b) set(b.dataset.pal, true)});
  let p=null; try{p=localStorage.getItem('lumen-palette')}catch(e){}
  set(p || 'olive');
};
K.buzz = () => { try{ navigator.vibrate && navigator.vibrate(8) }catch(e){} };
})();
