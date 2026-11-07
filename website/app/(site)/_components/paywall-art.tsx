"use client";

import { useId } from "react";
import { Light } from "@/components/kit";

// The paywall's picture: an open Bible glowing from within, with the Light (the mascot) rising out of it. Rays shimmer,
// a page lifts, the ribbon sways, sparks drift up. Everything moves slowly and stops for prefers-reduced-motion
// (flow.css .pw-art). Drawn in a 320 × 210 box; the Light is laid over it so it keeps its own breathing and halo.

// Text lines on a page, following its curve: words as dashes
const LINES = [0, 1, 2, 3, 4, 5];
const SPARKS = [
  { x: 62, y: 70, s: 1, d: 0 },
  { x: 258, y: 58, s: 1.2, d: 1.1 },
  { x: 92, y: 30, s: 0.7, d: 2.2 },
  { x: 236, y: 104, s: 0.8, d: 0.6 },
  { x: 40, y: 118, s: 0.6, d: 1.7 },
  { x: 288, y: 120, s: 0.7, d: 2.6 },
];
const MOTES = [
  { x: 128, d: 0, r: 1.6 },
  { x: 150, d: 1.4, r: 1.1 },
  { x: 172, d: 0.7, r: 1.8 },
  { x: 194, d: 2.1, r: 1.2 },
  { x: 140, d: 2.8, r: 1 },
  { x: 182, d: 3.5, r: 1.4 },
];
const RAYS = [
  { a: 112, b: 70, d: 0 },
  { a: 76, b: 30, d: 0.9 },
  { a: 40, b: 8, d: 1.8 },
  { a: -8, b: -40, d: 0.4 },
  { a: -44, b: -78, d: 1.3 },
  { a: -80, b: -118, d: 2.2 },
];

export function PaywallArt() {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (k: string) => `pa${raw}${k}`;
  const url = (k: string) => `url(#${id(k)})`;

  const pageLine = (side: 1 | -1, k: number) => {
    // Left page runs x 62 → 150, right page mirrors it around the gutter (160)
    const y = 138 + k * 4.6;
    const x1 = 160 - side * 98 + side * k * 0.6;
    const x2 = 160 - side * 12;
    return `M${x1} ${y - 2} C${160 - side * 70} ${y - 8} ${160 - side * 34} ${y - 5} ${x2} ${y + 8}`;
  };

  return (
    <div className="pw-art" aria-hidden>
      <svg viewBox="0 0 320 210" role="presentation">
        <defs>
          <radialGradient id={id("glow")} cx="160" cy="138" r="150" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFE6A8" stopOpacity=".75" />
            <stop offset=".45" stopColor="#F5C77E" stopOpacity=".28" />
            <stop offset="1" stopColor="#F5C77E" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id("ray")} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#FFE3A0" stopOpacity=".85" />
            <stop offset=".6" stopColor="#FFE3A0" stopOpacity=".18" />
            <stop offset="1" stopColor="#FFE3A0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id("leather")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8A4632" />
            <stop offset="1" stopColor="#4A2218" />
          </linearGradient>
          <linearGradient id={id("pageL")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#F6EBD2" />
            <stop offset=".8" stopColor="#FFF8E8" />
            <stop offset="1" stopColor="#E7D3AA" />
          </linearGradient>
          <linearGradient id={id("pageR")} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#F6EBD2" />
            <stop offset=".8" stopColor="#FFF8E8" />
            <stop offset="1" stopColor="#E7D3AA" />
          </linearGradient>
          <linearGradient id={id("edge")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E9D7B0" />
            <stop offset="1" stopColor="#CDB487" />
          </linearGradient>
          <linearGradient id={id("gilt")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#C98F45" />
            <stop offset=".5" stopColor="#FFE3A0" />
            <stop offset="1" stopColor="#C98F45" />
          </linearGradient>
          <radialGradient id={id("inner")} cx="160" cy="150" r="70" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFF4CF" stopOpacity=".9" />
            <stop offset="1" stopColor="#FFF4CF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Glow and rays rising from the open pages */}
        <ellipse className="pa-glow" cx="160" cy="138" rx="160" ry="110" fill={url("glow")} />
        <g className="pa-rays">
          {RAYS.map((r, i) => (
            <path key={i} d={`M154 142 L${160 - r.a} -6 L${160 - r.b} -6 L166 142Z`} fill={url("ray")} style={{ animationDelay: `${r.d}s` }} />
          ))}
        </g>

        {/* Shadow on the table */}
        <ellipse cx="160" cy="194" rx="128" ry="9" fill="#000" opacity=".16" />

        {/* Cover, with a gilt line along its edge */}
        <path d="M160 160 C126 146 82 144 30 152 L22 182 C76 172 124 174 160 190 C196 174 244 172 298 182 L290 152 C238 144 194 146 160 160Z" fill={url("leather")} />
        <path d="M27 178 C78 168 124 170 160 185 C196 170 242 168 293 178" fill="none" stroke={url("gilt")} strokeWidth="1.3" opacity=".8" />

        {/* Page block: edges under the top pages */}
        {[0, 1, 2].map((k) => (
          <g key={k}>
            <path d={`M160 ${172 - k * 3} C124 ${156 - k * 3} 82 ${154 - k * 3} 38 ${161 - k * 3}`} fill="none" stroke={url("edge")} strokeWidth="3.2" />
            <path d={`M160 ${172 - k * 3} C196 ${156 - k * 3} 238 ${154 - k * 3} 282 ${161 - k * 3}`} fill="none" stroke={url("edge")} strokeWidth="3.2" />
          </g>
        ))}

        {/* Left page */}
        <path d="M160 148 C128 128 86 124 44 132 L40 158 C84 150 126 152 160 166Z" fill={url("pageL")} />
        <g fill="none" stroke="#B9A57C" strokeWidth="1.25" strokeLinecap="round" opacity=".75" strokeDasharray="13 3 7 3 17 3 9 3">
          {LINES.map((k) => (
            <path key={k} d={pageLine(1, k)} />
          ))}
        </g>
        {/* A gilt drop cap */}
        <path d="M64 133.5 l5 -1.2 0 7 -5 1.2Z" fill={url("gilt")} opacity=".9" />

        {/* Right page, lifting gently */}
        <g className="pa-page">
          <path d="M160 148 C192 128 234 124 276 132 L280 158 C236 150 194 152 160 166Z" fill={url("pageR")} />
          <g fill="none" stroke="#B9A57C" strokeWidth="1.25" strokeLinecap="round" opacity=".75" strokeDasharray="11 3 15 3 6 3 12 3">
            {LINES.map((k) => (
              <path key={k} d={pageLine(-1, k)} />
            ))}
          </g>
        </g>

        {/* Light pooling in the gutter */}
        <ellipse className="pa-inner" cx="160" cy="150" rx="70" ry="22" fill={url("inner")} />
        <path d="M160 148 L160 168" stroke="#CDB487" strokeWidth="1.2" opacity=".7" />

        {/* Ribbon bookmark */}
        <g className="pa-ribbon">
          <path d="M163 160 L163 202 L167.5 196 L172 202 L172 158Z" fill="#B8432F" />
          <path d="M163 160 L163 202 L165 199.4 L165 159.4Z" fill="#8E2F21" />
        </g>

        {/* Sparks and drifting motes */}
        {SPARKS.map((s, i) => (
          <path
            key={i}
            className="pa-spark"
            transform={`translate(${s.x} ${s.y}) scale(${s.s})`}
            d="M0-6C.7-1.4 1.4-.7 6 0 1.4.7.7 1.4 0 6-.7 1.4-1.4.7-6 0-1.4-.7-.7-1.4 0-6Z"
            fill="#FFE3A0"
            style={{ animationDelay: `${s.d}s` }}
          />
        ))}
        {MOTES.map((m, i) => (
          <circle key={i} className="pa-mote" cx={m.x} cy="140" r={m.r} fill="#FFF1C9" style={{ animationDelay: `${m.d}s` }} />
        ))}
      </svg>

      {/* The mascot, rising out of the pages */}
      <div className="pa-light">
        <Light size={96} state="idle" label="" />
      </div>
    </div>
  );
}
