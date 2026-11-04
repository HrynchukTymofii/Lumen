// Lumen illustration kit, ported from design/kit/kit.js: flat landscape scenes and the Light.
// Pure functions returning SVG strings (our own markup, no user input), rendered on the server.
// The app (Expo) will reuse the same scene definitions.

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let uid = 0;
const f = (n: number) => n.toFixed(1);

function ridge(r: () => number, base: number, amp: number, n: number, smooth?: boolean) {
  const step = 440 / n;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = -20 + i * step + (r() - 0.5) * step * 0.35;
    const peak = i % 2 === 0;
    const y = base - (peak ? amp * (0.45 + 0.55 * r()) : amp * (0.05 + 0.25 * r()));
    pts.push([x, y]);
  }
  let d = `M-20 300 L${f(pts[0][0])} ${f(pts[0][1])}`;
  if (smooth) {
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1];
      const q = pts[i];
      const mx = (p[0] + q[0]) / 2;
      d += ` C${f(mx)} ${f(p[1])} ${f(mx)} ${f(q[1])} ${f(q[0])} ${f(q[1])}`;
    }
  } else pts.slice(1).forEach((p) => (d += ` L${f(p[0])} ${f(p[1])}`));
  return d + " L420 300 Z";
}

function pine(x: number, y: number, h: number) {
  const w = h * 0.34;
  return `M${x} ${y - h}L${x + w * 0.62} ${y - h * 0.55}L${x + w * 0.34} ${y - h * 0.55}L${x + w * 0.86} ${y - h * 0.2}L${x + w * 0.46} ${y - h * 0.2}L${x + w} ${y}L${x - w} ${y}L${x - w * 0.46} ${y - h * 0.2}L${x - w * 0.86} ${y - h * 0.2}L${x - w * 0.34} ${y - h * 0.55}L${x - w * 0.62} ${y - h * 0.55}Z`;
}

type Trees = { count: number; hmin: number; hmax: number; c: string; x0?: number; x1?: number };

function trees(r: () => number, y: number, { count, hmin, hmax, c, x0 = -10, x1 = 410 }: Trees) {
  let d = "";
  for (let i = 0; i < count; i++) {
    const x = x0 + ((x1 - x0) * (i + r() * 0.8)) / count;
    const h = hmin + (hmax - hmin) * r();
    d += pine(Number(x.toFixed(1)), y + r() * 6, h);
  }
  return `<path d="${d}" fill="${c}"/>`;
}

function cloud(x: number, y: number, s: number, c: string, o: number) {
  return `<g fill="${c}" opacity="${o}"><ellipse cx="${x}" cy="${y}" rx="${28 * s}" ry="${9 * s}"/><ellipse cx="${x - 10 * s}" cy="${y - 6 * s}" rx="${14 * s}" ry="${10 * s}"/><ellipse cx="${x + 9 * s}" cy="${y - 8 * s}" rx="${16 * s}" ry="${12 * s}"/></g>`;
}

type Scene = {
  seed: number;
  sky: [string, string];
  sun: { x: number; y: number; r: number; c: string; halo: string; moon?: boolean };
  clouds?: [number, number, number, string, number][];
  stars?: number;
  layers: { c: string; base: number; amp: number; n: number; smooth?: boolean; trees?: Trees }[];
  water?: { y: number; c: [string, string]; glint: string };
  river?: string;
  front: string;
};

// "dawn" is the Olive palette's sunrise (the brand palette chosen 31.10).
const SCENES: Record<string, Scene> = {
  dawn: {
    seed: 11, sky: ["#F5F0DA", "#E9D9A0"], sun: { x: 150, y: 120, r: 34, c: "#FFF7DC", halo: "#F6E3A0" },
    clouds: [[300, 60, 1.1, "#FFFBEA", 0.85], [70, 48, 0.8, "#FFFBEA", 0.6]],
    layers: [
      { c: "#B7C390", base: 178, amp: 70, n: 7 },
      { c: "#879A5C", base: 205, amp: 62, n: 6 },
      { c: "#56693A", base: 228, amp: 30, n: 9, smooth: true, trees: { count: 16, hmin: 18, hmax: 36, c: "#3A4A2A" } },
    ],
    water: { y: 232, c: ["#A7B788", "#7A8C59"], glint: "#FFF4CF" }, front: "#2C3820",
  },
  golden: {
    seed: 5, sky: ["#FBD78A", "#F4A24E"], sun: { x: 120, y: 118, r: 42, c: "#FFEAA0", halo: "#FFD36E" },
    layers: [
      { c: "#D98C52", base: 168, amp: 85, n: 5 },
      { c: "#A4644A", base: 196, amp: 70, n: 6 },
      { c: "#6E4639", base: 222, amp: 26, n: 10, smooth: true, trees: { count: 20, hmin: 14, hmax: 30, c: "#4E3029" } },
    ],
    water: { y: 226, c: ["#F0A048", "#D97C2E"], glint: "#FFE08A" }, front: "#3E2723",
  },
  lake: {
    seed: 3, sky: ["#D5F0E6", "#9FD8C9"], sun: { x: 280, y: 86, r: 26, c: "#F6FFF7", halo: "#E2F7EC" },
    clouds: [[110, 70, 1, "#EFFBF6", 0.8]],
    layers: [
      { c: "#93CDBE", base: 160, amp: 64, n: 7 },
      { c: "#5FA597", base: 188, amp: 52, n: 6 },
      { c: "#2F6F67", base: 206, amp: 22, n: 9, smooth: true, trees: { count: 22, hmin: 16, hmax: 34, c: "#1F504B" } },
    ],
    water: { y: 208, c: ["#4C9C92", "#2E746D"], glint: "#D8F3EA" }, front: "#1C3F3B",
  },
  meadow: {
    seed: 21, sky: ["#EEF5DD", "#D3E8BF"], sun: { x: 300, y: 78, r: 28, c: "#FFFBE6", halo: "#FFF1BC" },
    clouds: [[120, 64, 1.2, "#FFFFFF", 0.9]],
    layers: [
      { c: "#B6D69C", base: 176, amp: 46, n: 5, smooth: true },
      { c: "#8DBE78", base: 204, amp: 40, n: 5, smooth: true, trees: { count: 6, hmin: 20, hmax: 34, c: "#3D6E48", x0: 240, x1: 400 } },
      { c: "#5E9A5F", base: 240, amp: 30, n: 4, smooth: true },
    ],
    river: "#9ED0DE", front: "#3F7148",
  },
  dusk: {
    seed: 8, sky: ["#FCE1DA", "#EFB3B8"], sun: { x: 240, y: 128, r: 36, c: "#FFF0E6", halo: "#FFD3CC" },
    clouds: [[90, 72, 1, "#FFF1EE", 0.75]],
    layers: [
      { c: "#DFA3AE", base: 172, amp: 72, n: 6 },
      { c: "#B07B94", base: 200, amp: 60, n: 7 },
      { c: "#735274", base: 222, amp: 24, n: 9, smooth: true, trees: { count: 18, hmin: 14, hmax: 30, c: "#4F3854" } },
    ],
    water: { y: 226, c: ["#CF94A8", "#A86F8C"], glint: "#FFE3E6" }, front: "#3F2C44",
  },
  evening: {
    seed: 14, sky: ["#E9DEF7", "#BFA9E6"], sun: { x: 300, y: 90, r: 22, c: "#FFF8EE", halo: "#F2E6FF", moon: true }, stars: 14,
    layers: [
      { c: "#AE98DA", base: 170, amp: 76, n: 6 },
      { c: "#806BB4", base: 198, amp: 60, n: 7 },
      { c: "#4F4384", base: 220, amp: 22, n: 9, smooth: true, trees: { count: 18, hmin: 14, hmax: 30, c: "#372E63" } },
    ],
    water: { y: 222, c: ["#8F7BC4", "#61529C"], glint: "#F3EBFF" }, front: "#2C2552",
  },
  night: {
    seed: 2, sky: ["#2E3160", "#4D4683"], sun: { x: 90, y: 80, r: 20, c: "#FFF6DA", halo: "#7C74B8", moon: true }, stars: 34,
    layers: [
      { c: "#433F78", base: 176, amp: 70, n: 6 },
      { c: "#302D5C", base: 204, amp: 54, n: 7 },
      { c: "#1F1D40", base: 224, amp: 20, n: 10, smooth: true, trees: { count: 22, hmin: 14, hmax: 30, c: "#15142E" } },
    ],
    water: { y: 228, c: ["#363670", "#232350"], glint: "#FFF3C4" }, front: "#121128",
  },
  sky: {
    seed: 30, sky: ["#E2F1FA", "#B8DCEE"], sun: { x: 90, y: 76, r: 26, c: "#FFFFFF", halo: "#EAF6FD" },
    clouds: [[250, 58, 1.3, "#FFFFFF", 0.95], [340, 96, 0.8, "#FFFFFF", 0.8]],
    layers: [
      { c: "#A3C9DD", base: 168, amp: 80, n: 5 },
      { c: "#6F9FBC", base: 198, amp: 58, n: 6 },
      { c: "#3F6E8A", base: 226, amp: 24, n: 9, smooth: true, trees: { count: 18, hmin: 16, hmax: 32, c: "#2B5068" } },
    ],
    water: { y: 230, c: ["#7FB3CF", "#5A91B2"], glint: "#F1FAFF" }, front: "#24435A",
  },
};

export type SceneName = keyof typeof SCENES;
export type SceneOptions = { seed?: number; noSun?: boolean; noFront?: boolean; noBigTrees?: boolean };

export function sceneSvg(name: string, opts: SceneOptions = {}) {
  const S = SCENES[name] ?? SCENES.dawn; // unknown scene keys fall back to dawn (same rule as the app)
  const r = rng(S.seed + (opts.seed ?? 0));
  const id = `sc${++uid}`;
  let o = `<svg class="scene" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${S.sky[0]}"/><stop offset="1" stop-color="${S.sky[1]}"/></linearGradient>${
    S.water
      ? `<linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${S.water.c[0]}"/><stop offset="1" stop-color="${S.water.c[1]}"/></linearGradient>`
      : ""
  }</defs><rect width="400" height="300" fill="url(#${id}s)"/>`;

  for (let i = 0; i < (S.stars ?? 0); i++) {
    o += `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * 130).toFixed(0)}" r="${(0.6 + r() * 1.2).toFixed(1)}" fill="#FFF7DE" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  }
  const s = S.sun;
  if (!opts.noSun) {
    o += `<circle cx="${s.x}" cy="${s.y}" r="${s.r * 2.1}" fill="${s.halo}" opacity=".35"/><circle cx="${s.x}" cy="${s.y}" r="${s.r * 1.45}" fill="${s.halo}" opacity=".45"/><circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${s.c}"/>`;
    if (s.moon) o += `<circle cx="${s.x + s.r * 0.42}" cy="${s.y - s.r * 0.28}" r="${s.r * 0.86}" fill="${S.sky[0]}"/>`;
  }
  (S.clouds ?? []).forEach((c) => (o += cloud(...c)));
  S.layers.forEach((L) => {
    o += `<path d="${ridge(r, L.base, L.amp, L.n, L.smooth)}" fill="${L.c}"/>`;
    if (L.trees) o += trees(r, L.base + 4, L.trees);
  });
  if (S.river) {
    o += `<path d="M175 300 C 200 270, 150 258, 205 240 S 260 222, 238 210" fill="none" stroke="${S.river}" stroke-width="16" stroke-linecap="round"/><path d="M175 300 C 200 270, 150 258, 205 240" fill="none" stroke="#fff" stroke-width="2" opacity=".5" stroke-dasharray="10 14"/>`;
  }
  if (S.water) {
    const w = S.water;
    o += `<rect y="${w.y}" width="400" height="${300 - w.y}" fill="url(#${id}w)"/>`;
    for (let i = 0; i < 9; i++) {
      const y = w.y + 6 + i * ((300 - w.y) / 9);
      o += `<rect x="${(r() * 320).toFixed(0)}" y="${f(y)}" width="${(30 + r() * 90).toFixed(0)}" height="2.2" rx="1.1" fill="${w.glint}" opacity="${(0.25 + r() * 0.3).toFixed(2)}"/>`;
    }
    if (!opts.noSun) {
      for (let i = 0; i < 6; i++) {
        const wd = s.r * (1.4 - i * 0.18);
        o += `<rect x="${f(s.x - wd / 2 + (r() - 0.5) * 8)}" y="${f(w.y + 5 + i * 9)}" width="${f(wd)}" height="3.2" rx="1.6" fill="${w.glint}" opacity="${(0.75 - i * 0.1).toFixed(2)}"/>`;
      }
    }
  }
  if (!opts.noFront) {
    o += `<path d="M-10 300 L-10 262 C 30 250, 60 258, 90 270 C 110 278, 130 290, 150 300 Z" fill="${S.front}"/><path d="M410 300 L410 255 C 380 250, 350 262, 330 278 C 320 286, 312 294, 305 300 Z" fill="${S.front}"/>`;
    let g = "";
    for (let i = 0; i < 14; i++) {
      const x = (i < 7 ? -4 + i * 12 : 312 + (i - 7) * 14) + r() * 6;
      const h = 10 + r() * 16;
      g += `M${f(x)} ${300 - (i < 7 ? 28 - i * 3 : 30 - (i - 7) * 3)}q${(r() * 6 - 3).toFixed(1)} ${f(-h * 0.6)} ${(r() * 8 - 4).toFixed(1)} ${f(-h)}`;
    }
    o += `<path d="${g}" stroke="${S.front}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    if (!opts.noBigTrees) {
      let t = "";
      ([[18, 262, 74], [44, 270, 52], [384, 258, 66]] as const).forEach(([x, y, h]) => (t += pine(x, y, h * (0.85 + r() * 0.3))));
      o += `<path d="${t}" fill="${S.front}"/>`;
    }
  }
  return o + "</svg>";
}

export type LightState = "idle" | "listening" | "speaking" | "thinking" | "celebrating";

// The Light, drawn the same way as the app's Light (app/components/Light.tsx): a glowing sphere of warm
// light with a thin halo floating above it. Animations live in the CSS (.light …):
//   idle: breathes, halo floats · listening: quick pulse, halo brightens · thinking: halo turns
//   speaking: rings ripple out of the sphere · celebrating (web only): pulse + ripples
// Sphere centre (50, 60), radius 27 in the 100×100 drawing; the halo sits at (50, 21).
// `key` makes the gradient ids unique on the page; pass React's useId() so server and browser renders match.
export function lightSvg(key?: string) {
  const id = key ? `lg${key.replace(/[^a-zA-Z0-9]/g, "")}` : `lg${++uid}`;
  const ripple = (cls: string) =>
    `<circle class="ripple ${cls}" cx="50" cy="60" r="28" fill="none" stroke="#F5C77E" stroke-width="1.2"/>`;
  return `<svg viewBox="0 0 100 100"><defs>` +
    `<radialGradient id="${id}a" gradientUnits="userSpaceOnUse" cx="50" cy="60" r="40"><stop offset=".5" stop-color="#FFD98C" stop-opacity=".45"/><stop offset="1" stop-color="#FFD98C" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${id}b" gradientUnits="userSpaceOnUse" cx="50" cy="60" r="29" fx="42" fy="49"><stop offset="0" stop-color="#FFFBEC"/><stop offset=".35" stop-color="#FFE4A3"/><stop offset=".75" stop-color="#FBC676"/><stop offset=".92" stop-color="#F5AE6C" stop-opacity=".75"/><stop offset="1" stop-color="#F5AE6C" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${id}u" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#E8935A" stop-opacity="0"/><stop offset="1" stop-color="#E8935A" stop-opacity=".3"/></linearGradient>` +
    `<linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F5AE6C"/><stop offset=".5" stop-color="#FFF1C9"/><stop offset="1" stop-color="#F5AE6C"/></linearGradient>` +
    `</defs>` +
    `<circle class="aura" cx="50" cy="60" r="40" fill="url(#${id}a)"/>` +
    `${ripple("")}${ripple("r2")}${ripple("r3")}` +
    `<g class="sphere"><circle cx="50" cy="60" r="29" fill="url(#${id}b)"/><circle cx="50" cy="60" r="26" fill="url(#${id}u)"/><ellipse cx="41" cy="49" rx="8" ry="5" fill="#FFFFFF" opacity=".35" transform="rotate(-30 41 49)"/></g>` +
    `<g class="halo-float"><g class="halo"><ellipse class="halo-glow" cx="50" cy="21" rx="17" ry="4.6" fill="none" stroke="#FFD98C" stroke-width="6"/><ellipse cx="50" cy="21" rx="17" ry="4.6" fill="none" stroke="url(#${id}h)" stroke-width="2.4"/></g></g>` +
    `</svg>`;
}

const ink = 'fill="none" stroke="#26301F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';

// Ink doodles for pastel cards
export const DOODLES = {
  dove: `<svg viewBox="0 0 170 120" ${ink} aria-hidden="true"><path d="M30 70c20-2 34-14 46-32 6 22 2 40-12 52 26 4 52-6 70-26-2 30-30 50-64 48-18 0-30-8-40-18z" fill="#FAF8F1"/><path d="M76 38c8-14 22-20 36-18-8 8-12 18-12 30"/><circle cx="48" cy="66" r="2.2" fill="#26301F"/><path d="M26 72l-10 2 8 4"/><path d="M120 92c8 8 18 12 30 12M128 84c10 2 18 0 26-6" stroke-width="2"/></svg>`,
};

// Picture pills for the landing headlines: small scenes where the Light acts out the words around it
// ("Share [a heart rising to the Light] what's on your heart"). Drawn in a 160×100 box; `bg` sits behind the
// Light and `fg` in front of it. `light` places the sphere's centre in % and sizes it as a share of the height.
const heart = (x: number, y: number, s: number, c: string) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 9C-13 0-11-10-5-11-2-11.5 0-9 0-7 0-9 2-11.5 5-11 11-10 13 0 0 9Z" fill="${c}"/>` +
  `<ellipse cx="-5.5" cy="-5" rx="2.6" ry="1.6" fill="#fff" opacity=".55" transform="rotate(-30 -5.5 -5)"/></g>`;
const spark = (x: number, y: number, s: number, c = "#FFFFFF", o = 0.9) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0-5C.6-1.2 1.2-.6 5 0 1.2.6.6 1.2 0 5-.6 1.2-1.2.6-5 0-1.2-.6-.6-1.2 0-5Z" fill="${c}" opacity="${o}"/>`;
const grad = (id: string, a: string, b: string) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="160" height="100" fill="url(#${id})"/>`;

export type PillArt = { bg: string; fg: string; light: { x: number; y: number; size: number; state: LightState } };

export const PILLS: Record<string, PillArt> = {
  // "A daily [the Light rising like the morning sun] prayer"
  daily: {
    bg:
      grad("pd", "#FCF1D6", "#F5D59C") +
      `<g stroke="#FFF6DE" stroke-width="3" stroke-linecap="round" opacity=".7"><path d="M80 18V8M52 30l-7-7M108 30l7-7M40 52H30M120 52h10"/></g>`,
    fg:
      `<path d="M0 64C26 52 50 56 74 64S124 52 160 60V100H0Z" fill="#C8B27C"/>` +
      `<path d="M0 78C34 68 64 74 96 80S140 72 160 76V100H0Z" fill="#9A8551"/>` +
      `<path d="M0 90C40 84 90 92 160 86V100H0Z" fill="#6F5F38"/>`,
    light: { x: 50, y: 56, size: 0.56, state: "idle" },
  },
  // "Share [a heart floating up to the listening Light] what's on your heart"
  share: {
    bg: grad("ps", "#FDE7DE", "#F2B8B2"),
    fg:
      `<path d="M36 74C42 56 58 44 92 42" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="1 6" opacity=".9"/>` +
      heart(32, 80, 1.25, "#E0646E") + heart(58, 50, 0.7, "#EE8B92") +
      `<path d="M0 92C40 86 100 94 160 88V100H0Z" fill="#D9908C" opacity=".6"/>`,
    light: { x: 67, y: 42, size: 0.58, state: "listening" },
  },
  // "Pray [the Light going ahead on the path, a guide] with a guide"
  pray: {
    bg:
      grad("pp", "#F1F7E2", "#D3E8BF") +
      `<path d="M0 58C30 46 60 50 86 56S136 44 160 50V100H0Z" fill="#B6D69C"/>` +
      `<path d="M0 72C34 62 72 66 100 72S144 64 160 68V100H0Z" fill="#8DBE78"/>`,
    fg:
      `<path d="M58 100C64 90 92 86 86 76S68 68 80 60" fill="none" stroke="#F4EBCB" stroke-width="9" stroke-linecap="round"/>` +
      `<path d="M58 100C64 90 92 86 86 76S68 68 80 60" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 5" stroke-linecap="round" opacity=".8"/>` +
      `<path d="M0 88C30 82 50 86 64 92V100H0ZM160 84C140 82 118 86 104 94V100H160Z" fill="#5E9A5F"/>`,
    light: { x: 52, y: 34, size: 0.48, state: "speaking" },
  },
  // "Talk [the Light chatting, two speech bubbles] it through"
  talk: {
    bg:
      grad("pt", "#2E3160", "#4D4683") +
      spark(16, 18, 0.5, "#FFF7DE", 0.8) + spark(146, 88, 0.45, "#FFF7DE", 0.7) + spark(70, 12, 0.4, "#FFF7DE", 0.7),
    fg:
      `<rect x="78" y="16" width="66" height="30" rx="12" fill="#FFFFFF"/><path d="M86 44l-6 9 14-7Z" fill="#FFFFFF"/>` +
      `<rect x="88" y="25" width="44" height="3.6" rx="1.8" fill="#BDB6D9"/><rect x="88" y="33" width="30" height="3.6" rx="1.8" fill="#BDB6D9"/>` +
      `<rect x="92" y="58" width="48" height="24" rx="10" fill="#8F86C8"/><path d="M132 80l6 8-12-6Z" fill="#8F86C8"/>` +
      `<circle cx="106" cy="70" r="2.6" fill="#fff"/><circle cx="116" cy="70" r="2.6" fill="#fff" opacity=".8"/><circle cx="126" cy="70" r="2.6" fill="#fff" opacity=".6"/>`,
    light: { x: 33, y: 58, size: 0.58, state: "speaking" },
  },
  // "Your first [an open prayer book, the Light celebrating over it] prayer"
  first: {
    bg: grad("pr", "#FDE2A0", "#F4A65A") + spark(22, 22, 0.9, "#FFF6D8") + spark(138, 24, 1, "#FFF6D8") + spark(124, 52, 0.55, "#FFF6D8"),
    fg:
      `<path d="M80 74C66 66 46 66 30 70V96C46 92 66 92 80 100Z" fill="#FFF8EA"/>` +
      `<path d="M80 74C94 66 114 66 130 70V96C114 92 94 92 80 100Z" fill="#FFFDF6"/>` +
      `<path d="M80 74V100" stroke="#E2C9A0" stroke-width="1.4"/>` +
      `<g fill="none" stroke="#E6B97A" stroke-width="2" stroke-linecap="round"><path d="M40 78c10-2 20-2 30 1M40 85c10-2 20-2 30 1M90 79c10-3 20-3 30-1M90 86c10-3 18-3 26-1"/></g>`,
    light: { x: 50, y: 36, size: 0.52, state: "celebrating" },
  },
};
