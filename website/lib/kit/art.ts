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

// The Light: a flat sun with a dashed orbit. Animations live in the CSS (.light …).
export function lightSvg() {
  const id = `lg${++uid}`;
  let rays = "";
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    rays += `<line x1="${f(50 + Math.cos(a) * 40)}" y1="${f(50 + Math.sin(a) * 40)}" x2="${f(50 + Math.cos(a) * 48)}" y2="${f(50 + Math.sin(a) * 48)}"/>`;
  }
  const ripple = (cls: string) =>
    `<circle class="ripple ${cls}" cx="50" cy="50" r="36" fill="none" stroke="#F5AE6C" stroke-width="1.6"/>`;
  return `<svg viewBox="0 0 100 100"><defs><radialGradient id="${id}" cx=".4" cy=".36" r=".72"><stop offset="0" stop-color="#FFE9B0"/><stop offset=".7" stop-color="#FFD58A"/><stop offset="1" stop-color="#F8BC74"/></radialGradient></defs><circle class="halo" cx="50" cy="50" r="47" fill="#FFD98C" opacity=".22"/>${ripple("")}${ripple("r2")}${ripple("r3")}<g class="rays" style="stroke:var(--rays)" stroke-width="3.2" stroke-linecap="round">${rays}</g><circle class="orbit" cx="50" cy="50" r="39.5" fill="none" style="stroke:var(--orbit)" stroke-width="2.2" stroke-dasharray="15 9" stroke-linecap="round"/><circle class="core" cx="50" cy="50" r="29" fill="url(#${id})"/><circle cx="50" cy="50" r="19" fill="#FFF1C9" opacity=".55"/></svg>`;
}

const ink = 'fill="none" stroke="#26301F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';

// Ink doodles for pastel cards
export const DOODLES = {
  dove: `<svg viewBox="0 0 170 120" ${ink} aria-hidden="true"><path d="M30 70c20-2 34-14 46-32 6 22 2 40-12 52 26 4 52-6 70-26-2 30-30 50-64 48-18 0-30-8-40-18z" fill="#FAF8F1"/><path d="M76 38c8-14 22-20 36-18-8 8-12 18-12 30"/><circle cx="48" cy="66" r="2.2" fill="#26301F"/><path d="M26 72l-10 2 8 4"/><path d="M120 92c8 8 18 12 30 12M128 84c10 2 18 0 26-6" stroke-width="2"/></svg>`,
};
