// Shared drawing code for the Lumen store creatives (creatives.html) and the listing video (video.html):
// icons, the Light, app screens in iOS points, device frames, slide styles, listing and header layouts.
/* =============================== icons (components/ui/icons.tsx) =============================== */
const I = (d, c = "currentColor", s = 22, extra = "") =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const ic = {
  home: (c, s) => I(`<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19z"/><path d="M9 14.5c1.6 1.4 4.4 1.4 6 0"/>`, c, s),
  book: (c, s) => I(`<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5zM4 20.5A2.5 2.5 0 006.5 23H20v-5"/>`, c, s),
  compass: (c, s) => I(`<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>`, c, s),
  chat: (c, s) => I(`<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/>`, c, s),
  person: (c, s) => I(`<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>`, c, s),
  search: (c, s) => I(`<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5l-4.5-4.5"/>`, c, s),
  bell: (c, s) => I(`<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15zM10 21h4"/>`, c, s),
  play: (c, s) => I(`<path d="M7 4.5v15l12-7.5z" fill="${c}" stroke-width="1.5"/>`, c, s),
  pause: (c, s) => I(`<path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="${c}" stroke-width="1.5"/>`, c, s),
  skip: (c, s, f) => I(`<path d="M4 12a8 8 0 108-8H8M8 1L5 4l3 3"/>`, c, s, f ? `style="transform:scaleX(-1)"` : ""),
  back: (c, s) => I(`<path d="M15 5l-7 7 7 7"/>`, c, s),
  chev: (c, s) => I(`<path d="M9 5l7 7-7 7"/>`, c, s),
  chevDown: (c, s) => I(`<path d="M5 9l7 7 7-7"/>`, c, s),
  close: (c, s) => I(`<path d="M6 6l12 12M18 6L6 18"/>`, c, s),
  send: (c, s) => I(`<path d="M12 19V5M6 11l6-6 6 6"/>`, c, s),
  menu: (c, s) => I(`<path d="M4 7h16M4 12h16M4 17h16"/>`, c, s),
  bookmark: (c, s, filled) => I(`<path d="M6.5 3.5h11V21L12 16.5 6.5 21z" ${filled ? `fill="${c}"` : ""}/>`, c, s),
  note: (c, s) => I(`<path d="M20 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h6"/><path d="M17.5 3.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/>`, c, s),
  copy: (c, s) => I(`<path d="M9 9h10a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2z"/><path d="M5 15H4.5A1.5 1.5 0 013 13.5V5a2 2 0 012-2h8.5A1.5 1.5 0 0115 4.5V5"/>`, c, s),
  share: (c, s) => I(`<path d="M12 15V4M7.5 8L12 3.5 16.5 8M5 12.5V19a1.5 1.5 0 001.5 1.5h11A1.5 1.5 0 0019 19v-6.5"/>`, c, s),
  check: (c, s) => I(`<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.8"/>`, c, s),
  headphones: (c, s) => I(`<path d="M4 15v-3a8 8 0 0116 0v3"/><path d="M4 15a2 2 0 012-2h1v7H6a2 2 0 01-2-2zM20 15a2 2 0 00-2-2h-1v7h1a2 2 0 002-2z"/>`, c, s),
};
const statusIcons = (c) => `<span class="r">
  <svg width="19" height="12" viewBox="0 0 19 12"><g fill="${c}"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></g></svg>
  <svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.2c2.4 0 4.6.9 6.2 2.5l1.2-1.2A10.4 10.4 0 008.5.5 10.4 10.4 0 001.1 3.5l1.2 1.2a8.7 8.7 0 016.2-2.5zm0 3.4c1.5 0 2.8.6 3.8 1.5l1.2-1.2a7 7 0 00-10 0l1.2 1.2c1-.9 2.3-1.5 3.8-1.5zm0 3.4c.6 0 1.1.2 1.5.6L8.5 11.1 7 9.6c.4-.4.9-.6 1.5-.6z" fill="${c}"/></svg>
  <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="${c}" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2" fill="${c}"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="${c}" opacity=".5"/></svg></span>`;
const statusBar = (light, ipad) => `<div class="sb ${ipad ? "ipad" : ""}" style="color:${light ? "#fff" : "var(--ink)"}">
  <span>${ipad ? "9:41 &nbsp;Sun Nov 1" : "9:41"}</span>${statusIcons(light ? "#fff" : "#26301F")}</div>`;

/* =============================== the Light (components/Light.tsx) =============================== */
let lid = 0;
function light(size, { ripples = 0, aura = .45 } = {}) {
  const p = "L" + ++lid;
  const rip = Array.from({ length: ripples }, (_, i) =>
    `<circle cx="50" cy="60" r="${28 + i * 9}" fill="none" stroke="#F5C77E" stroke-width="${1.2 - i * .25}" opacity="${.7 - i * .2}"/>`).join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="overflow:visible;display:block">
  <defs>
    <radialGradient id="${p}a" gradientUnits="userSpaceOnUse" cx="50" cy="60" r="40"><stop offset=".5" stop-color="#FFD98C" stop-opacity="${aura}"/><stop offset="1" stop-color="#FFD98C" stop-opacity="0"/></radialGradient>
    <radialGradient id="${p}b" gradientUnits="userSpaceOnUse" cx="50" cy="60" r="29" fx="42" fy="49"><stop offset="0" stop-color="#FFFBEC"/><stop offset=".35" stop-color="#FFE4A3"/><stop offset=".75" stop-color="#FBC676"/><stop offset=".92" stop-color="#F5AE6C" stop-opacity=".75"/><stop offset="1" stop-color="#F5AE6C" stop-opacity="0"/></radialGradient>
    <linearGradient id="${p}u" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#E8935A" stop-opacity="0"/><stop offset="1" stop-color="#E8935A" stop-opacity=".3"/></linearGradient>
    <linearGradient id="${p}h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F5AE6C"/><stop offset=".5" stop-color="#FFF1C9"/><stop offset="1" stop-color="#F5AE6C"/></linearGradient>
  </defs>
  <circle cx="50" cy="60" r="40" fill="url(#${p}a)"/>${rip}
  <circle cx="50" cy="60" r="29" fill="url(#${p}b)"/><circle cx="50" cy="60" r="26" fill="url(#${p}u)"/>
  <ellipse cx="41" cy="49" rx="8" ry="5" fill="#fff" opacity=".35" transform="rotate(-30 41 49)"/>
  <ellipse cx="50" cy="21" rx="17" ry="4.6" fill="none" stroke="#FFD98C" stroke-width="6" opacity=".22"/>
  <ellipse cx="50" cy="21" rx="17" ry="4.6" fill="none" stroke="url(#${p}h)" stroke-width="2.4"/></svg>`;
}
const scene = (name, opts) => `<div class="scene-fill">${sceneSvg(name, opts || {})}</div>`;

/* =============================== app screens (in points) =============================== */
const tabBar = (active, W) => `<div class="tabbar" style="height:${W > 500 ? 74 : 92}px">
  ${[["Today", ic.home], ["Bible", ic.book], ["Discover", ic.compass], ["Companion", ic.chat], ["Me", ic.person]].map(([t, f]) =>
    `<div class="tab ${t === active ? "on" : ""}">${f(t === active ? "#5F7334" : "#717866", 22)}${t}</div>`).join("")}</div>`;

const SCREENS = {
  // Today: the carousel of prayers, the companion one tap away, today's prayer
  today: (W, H, ipad) => {
    const hero = Math.min(Math.round(H * .62), 580);
    return `
    <div class="abs" style="left:0;top:0;width:${W}px;height:${hero}px;background:#1D2518">
      ${scene("golden", { seed: 7 })}
      <div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(0,0,0,.28) 0%,rgba(0,0,0,0) 26%,rgba(0,0,0,0) 48%,rgba(0,0,0,.62) 100%)"></div>
      <div class="abs" style="inset:0;display:grid;place-items:center"><div style="width:88px;height:88px;border-radius:50%;background:rgba(255,255,255,.85);display:grid;place-items:center;padding-left:4px">${ic.play("#141A10", 34)}</div></div>
      <div class="abs" style="left:24px;right:24px;bottom:44px">
        <span class="chip">Morning</span>
        <div class="display" style="margin-top:10px;font-size:30px;line-height:36px;color:#fff">Morning Offering</div>
        <div style="margin-top:4px;font-size:16px;color:rgba(255,255,255,.85)">5 · 10 min · Begin the day with God</div>
      </div>
      <div class="abs" style="left:0;right:0;bottom:16px;display:flex;gap:6px;justify-content:center">
        <i style="width:16px;height:6px;border-radius:3px;background:#fff"></i>${"<i style='width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.45)'></i>".repeat(4)}</div>
      <div class="abs" style="left:20px;right:20px;top:${ipad ? 40 : 62}px;display:flex;justify-content:space-between;align-items:center">
        <div class="display" style="font-size:34px;color:#fff">Today</div>
        <div style="display:flex;gap:10px"><div class="glass">${ic.search("#fff", 20)}</div><div class="glass">${ic.bell("#fff", 20)}</div></div>
      </div>
    </div>
    <div class="abs" style="left:16px;right:16px;top:${hero + 20}px;${ipad ? "display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start" : ""}">
      <div style="display:flex;align-items:center;gap:16px;background:var(--lav);border-radius:28px;padding:20px">
        ${light(48)}
        <div style="flex:1"><div class="display" style="font-size:20px;line-height:28px">Ask the companion</div>
        <div style="font-size:15px;line-height:20px;color:rgba(38,48,31,.75);margin-top:2px">Questions on faith, answered from Scripture</div></div>
        ${ic.chev("#26301F", 20)}
      </div>
      <div class="card" style="margin-top:${ipad ? 0 : 24}px;padding:20px 24px 24px">
        <div style="display:flex;justify-content:space-between;align-items:center"><span class="kicker">Today’s prayer</span>${light(34)}</div>
        <div class="display" style="font-size:24px;line-height:32px;margin-top:4px">For a peaceful heart</div>
        <div class="serif" style="font-size:17px;line-height:28px;margin-top:10px">Lord, quiet the noise in me. Teach me to rest in You, and to carry Your peace into everything I do today.</div>
      </div>
    </div>
    ${tabBar("Today", W)}`;
  },

  // Bible: Psalm 23 with highlights and the verse sheet open
  bible: (W, H, ipad) => {
    const col = ipad ? `left:${(W - 600) / 2}px;width:600px` : `left:20px;right:20px`;
    return `
    <div class="abs" style="left:20px;right:20px;top:${ipad ? 44 : 66}px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="display" style="font-size:30px;line-height:36px">Bible</div>
        <div style="display:flex;gap:10px"><div class="round">${ic.search("#26301F", 20)}</div><div class="round">${ic.menu("#26301F", 20)}</div></div>
      </div>
      <div style="display:flex;align-items:center;margin-top:12px;gap:6px">
        <span style="font-weight:800;font-size:20px">Psalms 23</span>${ic.chevDown("#26301F", 18)}
        <span style="margin-left:auto">${ic.bookmark("#5F7334", 24, true)}</span>
      </div>
    </div>
    <div class="abs" style="${col};top:${ipad ? 160 : 182}px">
      <div class="display" style="font-size:30px;line-height:40px">Psalm 23</div>
      <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin:2px 0 16px">World English Bible</div>
      <div class="serif verse" style="font-size:19px;line-height:34px">
        <sup>1</sup><span class="hl" style="background:var(--butter)">Yahweh is my shepherd: I shall lack nothing.</span>
        <sup>2</sup>He makes me lie down in green pastures. He leads me beside still waters.
        <sup>3</sup>He restores my soul. He guides me in the paths of righteousness for his name’s sake.
        <sup>4</sup><span class="hl" style="background:var(--sage)">Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me.</span> Your rod and your staff, they comfort me.
        <sup>5</sup>You prepare a table before me in the presence of my enemies. You anoint my head with oil. My cup runs over.
        <sup>6</sup><span class="hl" style="background:var(--butter);outline:2px solid #E9D48C">Surely goodness and loving kindness shall follow me all the days of my life,</span> and I will dwell in Yahweh’s house forever.
      </div>
    </div>
    <div class="abs" style="left:0;right:0;bottom:0;background:var(--card);border-radius:28px 28px 0 0;padding:12px 24px ${ipad ? 30 : 40}px;box-shadow:0 -10px 30px rgba(0,0,0,.1);z-index:31">
      <div style="width:40px;height:4px;border-radius:2px;background:var(--line);margin:0 auto 12px"></div>
      <div style="display:flex;align-items:center"><span style="width:40px"></span><span style="flex:1;text-align:center;font-weight:800;font-size:18px">Psalm 23:6</span>
        <span style="width:40px;height:40px;border-radius:50%;background:var(--bg);display:grid;place-items:center">${ic.close("#26301F", 16)}</span></div>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:16px">
        ${["butter", "sage", "sky", "rose"].map((c, i) => `<span style="width:44px;height:44px;border-radius:50%;background:var(--${c});display:grid;place-items:center;${i === 0 ? "border:2.5px solid #26301F" : ""}">${i === 0 ? ic.check("#26301F", 16) : ""}</span>`).join("")}
      </div>
      <div style="margin-top:16px;background:var(--bg);border-radius:16px;padding:12px 16px;color:var(--dim);font-size:15px">Add a note…</div>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:16px">
        ${[["Note", ic.note], ["Copy", ic.copy], ["Share", ic.share], ["Ask", ic.chat]].map(([t, f]) =>
          `<div style="width:64px;display:flex;flex-direction:column;align-items:center;gap:6px"><span style="width:56px;height:56px;border-radius:50%;background:var(--bg);display:grid;place-items:center">${f("#26301F", 22)}</span><span style="font-weight:800;font-size:12px">${t}</span></div>`).join("")}
      </div>
    </div>`;
  },

  // Companion: a conversation answered with real verses
  companion: (W, H, ipad) => {
    const col = ipad ? `left:${(W - 620) / 2}px;width:620px` : `left:16px;right:16px`;
    return `
    <div class="abs" style="left:0;right:0;top:0;padding:${ipad ? 36 : 60}px 16px 12px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px;background:var(--bg)">
      <span style="width:40px;height:40px;display:grid;place-items:center">${ic.back("#26301F", 20)}</span>
      <span style="flex:1;font-weight:800;font-size:16px">Finding peace when anxious</span>${light(36)}
    </div>
    <div class="abs" style="${col};top:${ipad ? 110 : 136}px;display:flex;flex-direction:column;gap:12px">
      <div style="align-self:flex-end;max-width:85%;background:var(--olive);border-radius:24px 24px 8px 24px;padding:12px 16px;font-size:16px;line-height:24px">I can’t stop worrying about my job. What does the Bible say about anxiety?</div>
      <div style="max-width:92%;display:flex;flex-direction:column;gap:8px">
        <div style="background:var(--card);border-radius:24px 24px 24px 8px;padding:12px 16px;font-size:16px;line-height:24px">That weight is real, and you don’t have to carry it alone. Paul says to bring every worry to God in prayer, with thanks, and promises a peace that guards your heart. Jesus also invites us to take life one day at a time.</div>
        ${[["Philippians 4:6–7", "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God."],
           ["Matthew 6:34", "Therefore don’t be anxious for tomorrow, for tomorrow will be anxious for itself."]].map(([r, t]) => `
        <div style="border:1.5px solid rgba(95,115,52,.4);border-radius:16px;padding:12px 16px">
          <div style="display:flex;align-items:center;gap:8px;color:var(--oliveDeep);font-weight:800;font-size:14px">${ic.book("#5F7334", 15)}${r} · WEB</div>
          <div class="serif" style="margin-top:4px;font-size:15px;line-height:24px;color:var(--muted)">${t}</div>
        </div>`).join("")}
        <div style="background:var(--card);border-radius:24px 24px 24px 8px;padding:12px 16px;font-size:16px;line-height:24px">Would you like me to pray with you about it now?</div>
      </div>
      <div style="align-self:flex-end;max-width:85%;background:var(--olive);border-radius:24px 24px 8px 24px;padding:12px 16px;font-size:16px;line-height:24px">Yes, please</div>
    </div>
    <div class="abs" style="left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);padding:10px 12px ${ipad ? 24 : 38}px;display:flex;gap:8px;align-items:flex-end">
      <div style="flex:1;height:44px;border-radius:24px;background:var(--bg);padding:11px 16px;color:var(--dim);font-size:16px">Write a message</div>
      <span style="width:44px;height:44px;border-radius:50%;background:var(--ink);opacity:.3;display:grid;place-items:center">${ic.send("#FAF8F1", 18)}</span>
    </div>`;
  },

  // Player: a guided prayer read aloud, the line being spoken on the card
  player: (W, H, ipad) => `
    ${scene("dusk", { seed: 3 })}
    <div class="abs" style="left:16px;right:16px;top:${ipad ? 40 : 62}px;display:flex;justify-content:space-between;align-items:center">
      <span class="round">${ic.close("#26301F", 18)}</span><span style="font-weight:800;font-size:14px;color:rgba(255,255,255,.9)">10 min</span><span style="width:44px"></span>
    </div>
    <div class="abs" style="left:0;right:0;top:${ipad ? 260 : 210}px;display:grid;place-items:center">${light(ipad ? 190 : 150, { ripples: 3, aura: .6 })}</div>
    <div class="abs" style="left:${ipad ? (W - 560) / 2 : 16}px;right:${ipad ? (W - 560) / 2 : 16}px;bottom:${ipad ? 50 : 50}px;background:rgba(255,255,255,.9);border-radius:28px;padding:20px 24px 24px">
      <div class="kicker">Evening Examen</div>
      <div class="serif" style="margin-top:12px;font-size:19px;line-height:32px;min-height:84px">Lord, as this day comes to an end, I place every moment of it in Your hands.</div>
      <div style="margin-top:16px;height:6px;border-radius:3px;background:var(--line);overflow:hidden"><div style="width:38%;height:100%;background:var(--oliveDeep);border-radius:3px"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px;color:var(--muted)"><span>3:48</span><span>10:00</span></div>
      <div style="display:flex;justify-content:center;align-items:center;gap:32px;margin-top:12px">
        ${ic.skip("#26301F", 24)}
        <span style="width:64px;height:64px;border-radius:50%;background:var(--ink);display:grid;place-items:center">${ic.pause("#FAF8F1", 26)}</span>
        ${ic.skip("#26301F", 24, true)}
      </div>
    </div>`,

  // Discover: prayers for every moment, the Bible and the companion as tiles
  discover: (W, H, ipad) => {
    const tiles = [["Morning", "dawn", 4], ["Evening", "evening", 5], ["Sleep", "night", 6], ["Peace", "lake", 7], ["Psalms", "golden", 8], ["Family", "meadow", 9], ["Quick prayers", "golden", 21], ["The Bible", "meadow", 5]];
    const cols = ipad ? 3 : 2;
    return `
    <div class="abs" style="left:0;right:0;top:${ipad ? 44 : 66}px">
      <div class="display" style="padding:0 20px;font-size:34px;line-height:40px">Discover</div>
      <div style="margin:16px 16px 0;height:52px;border-radius:26px;border:1.5px solid var(--line2);background:var(--card);display:flex;align-items:center;gap:10px;padding:0 20px;color:var(--muted);font-size:16px">${ic.search("#717866", 20)}Prayers, topics, Bible books…</div>
      <div style="margin:20px 16px 0;display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px">
        ${tiles.slice(0, 4).map(([t, s, seed]) => `<div class="tile">${scene(s, { seed, noBigTrees: true })}<div class="shade"></div><div class="lbl">${t}</div></div>`).join("")}
        <div class="tile" style="background:var(--lav)"><div class="abs" style="inset:0;display:grid;place-items:center;padding-bottom:24px">${light(ipad ? 90 : 70)}</div><div class="lbl" style="color:var(--ink)">Ask the companion</div></div>
        ${tiles.slice(4).map(([t, s, seed]) => `<div class="tile">${scene(s, { seed, noBigTrees: true })}<div class="shade"></div><div class="lbl">${t}</div></div>`).join("")}
        ${ipad ? [["Grief", "sky", 15], ["Notes &amp; highlights", "dusk", 13]].map(([t, s, seed]) => `<div class="tile">${scene(s, { seed, noBigTrees: true })}<div class="shade"></div><div class="lbl">${t}</div></div>`).join("") : ""}
      </div>
    </div>
    ${tabBar("Discover", W)}`;
  },
};

/* =============================== devices =============================== */
// Phone: a 402×874pt screen drawn at `w` design px wide
function phone(screen, w, { left, top, rotate = 0, light: lightBar = false, extra = "" }) {
  const bez = w * .034, sw = w - bez * 2, k = sw / 402, sh = 874 * k, rad = w * .155;
  return `<div class="device" style="left:${left}px;top:${top}px;width:${w}px;height:${sh + bez * 2}px;border-radius:${rad}px;transform:rotate(${rotate}deg)">
    <div class="screen" style="left:${bez}px;top:${bez}px;width:${sw}px;height:${sh}px;border-radius:${rad - bez}px">
      <div class="app" style="width:402px;height:874px;transform:scale(${k})">${SCREENS[screen](402, 874, false)}${statusBar(lightBar, false)}</div>
      <div class="island" style="top:${11 * k}px;width:${124 * k}px;height:${36 * k}px"></div>
    </div>${extra}</div>`;
}
// iPad: a 768×1024pt screen
function tablet(screen, w, { left, top, light: lightBar = false }) {
  const bez = w * .028, sw = w - bez * 2, k = sw / 768, sh = 1024 * k, rad = w * .055;
  return `<div class="device" style="left:${left}px;top:${top}px;width:${w}px;height:${sh + bez * 2}px;border-radius:${rad}px">
    <div class="screen" style="left:${bez}px;top:${bez}px;width:${sw}px;height:${sh}px;border-radius:${rad - bez * .8}px">
      <div class="app" style="width:768px;height:1024px;transform:scale(${k})">${SCREENS[screen](768, 1024, true)}${statusBar(lightBar, true)}</div>
    </div></div>`;
}

/* =============================== the five slides =============================== */
// One short line per slide; <em> is set in Literata italic as the accent
const SLIDES = [
  { screen: "today",     line: "A quiet place to <em>pray</em>, every day", lightBar: true,  sceneName: "golden", seed: 2 },
  { screen: "bible",     line: "“Your word is a <em>lamp</em> to my feet”",   lightBar: false, sceneName: "meadow", seed: 5 },
  { screen: "companion", line: "Ask anything. <em>Scripture</em> answers",     lightBar: false, sceneName: "lake",   seed: 9 },
  { screen: "player",    line: "Close your eyes and <em>pray along</em>",       lightBar: true,  sceneName: "dusk",   seed: 3 },
  { screen: "discover",  line: "A prayer for <em>every moment</em>",           lightBar: false, sceneName: "dawn",   seed: 11 },
];

// Floating details that lift out of the phone in the "night" style
const FLOAT = {
  today: () => `<div style="display:flex;align-items:center;gap:14px;background:#fff;border-radius:26px;padding:16px 22px;box-shadow:0 24px 50px rgba(0,0,0,.35)"><span style="color:#5F7334">${ic.check("#5F7334", 22)}</span><div><div style="font-weight:800;font-size:19px">Prayed today</div><div style="font-size:14px;color:var(--muted)">5 days this week</div></div></div>`,
  bible: () => `<div class="serif" style="background:var(--sage);border-radius:22px;padding:16px 22px;font-size:20px;line-height:30px;max-width:330px;box-shadow:0 24px 50px rgba(0,0,0,.35)">“I will fear no evil, for you are with me.”<div style="font-family:Manrope;font-weight:800;font-size:13px;color:#5F7334;margin-top:6px">PSALM 23:4</div></div>`,
  companion: () => `<div style="border-radius:20px;padding:14px 20px;background:#fff;max-width:340px;box-shadow:0 24px 50px rgba(0,0,0,.35)"><div style="display:flex;gap:8px;align-items:center;color:#5F7334;font-weight:800;font-size:15px">${ic.book("#5F7334", 16)}Philippians 4:7 · WEB</div><div class="serif" style="font-size:17px;line-height:26px;color:#525a47;margin-top:4px">The peace of God, which surpasses all understanding, will guard your hearts.</div></div>`,
  player: () => `<div style="display:flex;align-items:center;gap:14px;background:#fff;border-radius:26px;padding:14px 22px 14px 14px;box-shadow:0 24px 50px rgba(0,0,0,.35)"><span style="width:48px;height:48px;border-radius:50%;background:var(--ink);display:grid;place-items:center">${ic.headphones("#FAF8F1", 24)}</span><div><div style="font-weight:800;font-size:18px">Guided audio</div><div style="font-size:14px;color:var(--muted)">5, 10 or 15 minutes</div></div></div>`,
  discover: () => `<div style="display:flex;gap:10px;flex-wrap:wrap;max-width:360px">${["Sleep", "Peace", "Grief", "Family", "Psalms"].map(t => `<span style="background:#fff;border-radius:999px;padding:10px 18px;font-weight:800;font-size:17px;box-shadow:0 16px 34px rgba(0,0,0,.3)">${t}</span>`).join("")}</div>`,
};

const headline = (html, { size, color, accent, align = "center", width }) =>
  `<div class="display" style="font-size:${size}px;line-height:1.08;letter-spacing:-.01em;text-wrap:balance;color:${color};text-align:${align};${width ? `width:${width}px;margin:0 auto` : ""}">${html.replace(/<em>/g, `<em class="serif" style="font-style:italic;font-weight:500;color:${accent}">`)}</div>`;

/* Three listing styles. Each draws a slide in design px: phone 603×1311 (×2 = 1206×2622), iPad 1032×1376 (×2 = 2064×2752). */
const STYLES = {
  // A · Cream: the app's own paper colour, the Light's glow behind the phone, rolling hills at the foot
  cream: (sl, i, W, H, ipad) => {
    const pw = ipad ? 760 : 470, top = ipad ? 320 : 300;
    const hills = `<svg class="abs" style="left:0;bottom:0" width="${W}" height="${H * .36}" viewBox="0 0 400 140" preserveAspectRatio="none">
      <path d="M0 60 Q100 ${30 + i * 6} 200 52 T400 ${46 - i * 4} V140 H0Z" fill="#D8E3C4"/><path d="M0 92 Q120 70 230 88 T400 80 V140 H0Z" fill="#C5D19E"/><path d="M0 118 Q150 104 260 114 T400 110 V140 H0Z" fill="#A9B97A"/></svg>`;
    return `<div class="abs" style="inset:0;background:radial-gradient(120% 70% at 50% 62%,#FFF1CF 0%,#FAF8F1 55%,#F4F0E3 100%)"></div>
      <div class="abs" style="left:50%;top:${H * .5}px;width:${W * 1.1}px;height:${W * 1.1}px;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(255,217,140,.55),rgba(255,217,140,0) 62%)"></div>
      ${hills}
      <div class="abs" style="left:${ipad ? 90 : 40}px;right:${ipad ? 90 : 40}px;top:${ipad ? 110 : 112}px">${headline(sl.line, { size: ipad ? 70 : 58, color: "#26301F", accent: "#5F7334" })}</div>
      ${ipad ? tablet(sl.screen, pw, { left: (W - pw) / 2, top, light: sl.lightBar }) : phone(sl.screen, pw, { left: (W - pw) / 2, top, light: sl.lightBar })}`;
  },

  // B · Golden hour: each slide is one of the app's landscapes, morning to night, the headline in white
  landscape: (sl, i, W, H, ipad) => {
    const pw = ipad ? 760 : 470, top = ipad ? 320 : 300;
    return `${scene(sl.sceneName, { seed: sl.seed })}
      <div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(20,26,16,.38),rgba(20,26,16,0) 30%,rgba(20,26,16,0) 70%,rgba(20,26,16,.35))"></div>
      <div class="abs" style="left:${ipad ? 90 : 40}px;right:${ipad ? 90 : 40}px;top:${ipad ? 110 : 112}px;text-shadow:0 4px 30px rgba(0,0,0,.25)">${headline(sl.line, { size: ipad ? 70 : 58, color: "#fff", accent: "#FFE4A3" })}</div>
      ${ipad ? tablet(sl.screen, pw, { left: (W - pw) / 2, top, light: sl.lightBar }) : phone(sl.screen, pw, { left: (W - pw) / 2, top, light: sl.lightBar })}`;
  },

  // C · Night glow: dark olive night, the Light shining behind a tilted phone, one detail floating out of it
  night: (sl, i, W, H, ipad) => {
    const pw = ipad ? 740 : 450, rot = i % 2 ? 4 : -4, top = ipad ? 340 : 330;
    const stars = Array.from({ length: 40 }, (_, k) => { const x = (k * 137.5) % W, y = (k * 89.3) % (H * .9); return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${1 + (k % 3) * .6}" fill="#FFF1C9" opacity="${.25 + (k % 4) * .12}"/>`; }).join("");
    const fx = i % 2 ? "left" : "right", float = FLOAT[sl.screen]();
    // Where the detail floats: over a part of the screen that doesn't need to be read
    const fy = { today: .38, bible: .47, companion: .8, player: .42, discover: .8 }[sl.screen];
    return `<div class="abs" style="inset:0;background:radial-gradient(90% 60% at 50% 55%,#34401F 0%,#1A2213 55%,#10150C 100%)"></div>
      <svg class="abs" style="inset:0" width="${W}" height="${H}">${stars}</svg>
      <div class="abs" style="left:50%;top:${H * .56}px;width:${W * 1.3}px;height:${W * 1.3}px;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(255,217,140,.45),rgba(255,217,140,0) 60%)"></div>
      <div class="abs" style="left:${ipad ? 90 : 40}px;right:${ipad ? 90 : 40}px;top:${ipad ? 110 : 112}px">${headline(sl.line, { size: ipad ? 70 : 58, color: "#FAF3DF", accent: "#FFD98C" })}</div>
      ${ipad ? tablet(sl.screen, pw, { left: (W - pw) / 2, top, light: sl.lightBar }) : phone(sl.screen, pw, { left: (W - pw) / 2, top, rotate: rot, light: sl.lightBar })}
      <div class="abs" style="${fx}:${ipad ? 70 : 22}px;top:${H * fy}px;transform:rotate(${-rot / 2}deg) scale(${ipad ? 1.25 : 1});transform-origin:${fx} top">${float}</div>`;
  },
};

/* =============================== headers =============================== */
// A tilted grid of scene tiles, the Light and the name in the middle. Drawn at 2000×857 (×1.92 = 3840×1646)
function header(dark) {
  const names = ["dawn", "golden", "lake", "meadow", "dusk", "evening", "night", "sky"];
  const tw = 230, th = 172, gap = 26, cols = 13, rows = 7;
  let tiles = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = (r * 5 + c * 3) % names.length, x = c * (tw + gap) + (r % 2 ? (tw + gap) / 2 : 0), y = r * (th + gap);
    const special = (r * cols + c) % 9 === 4;
    tiles += `<div class="abs" style="left:${x}px;top:${y}px;width:${tw}px;height:${th}px;border-radius:28px;overflow:hidden;${special ? `background:${dark ? "#2A3420" : "#E3E0EA"};display:grid;place-items:center` : ""}">${special ? light(110) : scene(names[k], { seed: r * 13 + c, noBigTrees: true })}</div>`;
  }
  const bg = dark ? "#141A10" : "#FAF8F1", ink = dark ? "#FAF3DF" : "#26301F";
  return `<div class="abs" style="inset:0;background:${bg}"></div>
    <div class="abs" style="left:-560px;top:-420px;width:${cols * (tw + gap) + 200}px;height:${rows * (th + gap)}px;transform:rotate(-12deg);transform-origin:50% 50%;opacity:${dark ? .9 : 1}">${tiles}</div>
    <div class="abs" style="inset:0;background:radial-gradient(42% 62% at 50% 50%,${bg} 0%,${bg}F2 38%,${bg}00 100%)"></div>
    <div class="abs" style="left:0;right:0;top:170px;display:flex;flex-direction:column;align-items:center">
      ${light(230, { aura: dark ? .6 : .5 })}
      <div class="display" style="font-size:190px;line-height:1;letter-spacing:-.02em;color:${ink};margin-top:-6px">Lumen</div>
    </div>`;
}

/* =============================== listing (search results) =============================== */
// 3840×2560 like PDR's search-results creative, drawn at 2000×1333. The line sits in the top third,
// the bottom is picture only. Night glow first, as chosen; the last option is a cream counterpart.
const nightSky = (W, H, n = 70) => `<div class="abs" style="inset:0;background:radial-gradient(80% 75% at 50% 70%,#3A4722 0%,#1A2213 55%,#10150C 100%)"></div>
  <svg class="abs" style="inset:0" width="${W}" height="${H}">${Array.from({ length: n }, (_, k) => `<circle cx="${((k * 137.5) % W).toFixed(0)}" cy="${((k * 71.3) % (H * .75)).toFixed(0)}" r="${1.2 + (k % 3) * .8}" fill="#FFF1C9" opacity="${.2 + (k % 4) * .13}"/>`).join("")}</svg>`;
const glow = (x, y, d, o = .45) => `<div class="abs" style="left:${x - d / 2}px;top:${y - d / 2}px;width:${d}px;height:${d}px;background:radial-gradient(circle,rgba(255,217,140,${o}),rgba(255,217,140,0) 62%)"></div>`;
const ridges = (W, H, cols) => `<svg class="abs" style="left:0;bottom:0" width="${W}" height="${H * .3}" viewBox="0 0 400 100" preserveAspectRatio="none">
  <path d="M0 40 Q60 10 120 34 T240 26 T400 30 V100 H0Z" fill="${cols[0]}"/><path d="M0 64 Q90 44 190 60 T400 52 V100 H0Z" fill="${cols[1]}"/><path d="M0 86 Q120 72 250 84 T400 80 V100 H0Z" fill="${cols[2]}"/></svg>`;
const listTop = (html, color, accent, size = 92) => `<div class="abs" style="left:120px;right:120px;top:96px">${headline(html, { size, color, accent })}</div>`;
const fan = (W, H, screens, light) => {
  const pw = 500, cx = W / 2;
  return [[screens[0], -330 - pw / 2, 390, -9], [screens[2], 330 - pw / 2, 390, 9], [screens[1], -pw / 2, 300, 0]]
    .map(([s, dx, y, r]) => phone(s, pw, { left: cx + dx, top: y, rotate: r, light: light.includes(s) })).join("");
};

const LISTINGS = [
  { name: "The Light", desc: "The mascot shining over the hills at night",
    draw: (W, H) => `${nightSky(W, H)}${glow(W / 2, 830, 1500, .5)}
      ${ridges(W, H, ["#2A3519", "#202914", "#161D0F"])}
      <div class="abs" style="left:${W / 2 - 300}px;top:500px">${light(600, { ripples: 3, aura: .7 })}</div>
      ${listTop("Your companion in <em>prayer</em>", "#FAF3DF", "#FFD98C")}` },
  { name: "Three phones", desc: "Bible, companion and guided audio fanned out",
    draw: (W, H) => `${nightSky(W, H)}${glow(W / 2, 900, 1700, .5)}
      ${fan(W, H, ["bible", "companion", "player"], ["player"])}
      ${listTop("Read, ask and <em>pray along</em>", "#FAF3DF", "#FFD98C")}` },
  { name: "Lamp to my feet", desc: "The verse over the app's night landscape, the Light above the lake",
    draw: (W, H) => `${scene("night", { seed: 4, noSun: true })}
      <div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(16,21,12,.55),rgba(16,21,12,0) 45%)"></div>
      ${glow(W / 2, 760, 900, .4)}<div class="abs" style="left:${W / 2 - 170}px;top:560px">${light(340, { aura: .7 })}</div>
      ${listTop("“Your word is a <em>lamp</em> to my feet”", "#FAF3DF", "#FFD98C")}` },
  { name: "Ask anything", desc: "The companion's chat with verse and audio cards floating beside it",
    draw: (W, H) => `${nightSky(W, H)}${glow(W / 2, 900, 1500, .45)}
      ${phone("companion", 520, { left: W / 2 - 260, top: 300 })}
      <div class="abs" style="left:170px;top:560px;transform:rotate(-4deg) scale(1.45);transform-origin:left top">${FLOAT.bible()}</div>
      <div class="abs" style="right:190px;top:700px;transform:rotate(4deg) scale(1.5);transform-origin:right top">${FLOAT.player()}</div>
      ${listTop("Ask anything. <em>Scripture</em> answers", "#FAF3DF", "#FFD98C")}` },
  { name: "Cream fan", desc: "The three phones on the app's paper colour, for contrast",
    draw: (W, H) => `<div class="abs" style="inset:0;background:radial-gradient(90% 70% at 50% 75%,#FFF1CF 0%,#FAF8F1 55%,#F1ECDD 100%)"></div>
      ${ridges(W, H, ["#D8E3C4", "#C5D19E", "#A9B97A"])}
      ${fan(W, H, ["bible", "companion", "player"], ["player"])}
      ${listTop("A quiet place to <em>pray</em>", "#26301F", "#5F7334")}` },
];

