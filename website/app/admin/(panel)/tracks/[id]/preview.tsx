"use client";

import { useRef, useState } from "react";
import type { Variant } from "../../../_lib/api";
import { fmtDuration } from "../../../_lib/ui";

// Sky colours per scene, close to the app's illustrations (the full SVG scenes come with the app player).
const SKY: Record<string, [string, string]> = {
  dawn: ["#C5D19E", "#F2E4B4"],
  golden: ["#F2D27A", "#FBEFCF"],
  lake: ["#A9C6D6", "#E3EEF0"],
  meadow: ["#BFD69A", "#EEF3DC"],
  dusk: ["#C9A9C9", "#F3D9C4"],
  evening: ["#8C95B8", "#E5C7A8"],
  night: ["#1E2A44", "#3C4A6B"],
  sky: ["#9FC3E0", "#E6F0F7"],
};

// Mirrors the app player (the editor remounts it via `key` when the audio changes): scene, the Light, the current line on a frosted panel, progress.
// The picture button in the top-right corner uploads or replaces the prayer's cover; the preview shows it straight away.
type PictureProps = {
  imageUrl: string | null;
  busy: boolean;
  disabled: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
};

const EMPTY: Variant = { minutes: 3, url: null, durationSec: null, lines: [] };

export function Preview({
  variant = EMPTY,
  scene,
  title,
  picture,
}: {
  variant?: Variant;
  scene: string;
  title: string;
  picture: PictureProps;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [top, bottom] = SKY[scene] ?? SKY.dawn;
  const hasImage = Boolean(picture.imageUrl);
  const night = scene === "night" || hasImage;

  const duration = variant.durationSec ?? 0;
  const timed = variant.lines.every((l) => l.t != null);
  // Without timings (manual uploads), spread the lines evenly over the audio
  const startOf = (i: number) => (timed ? variant.lines[i].t! : (duration * i) / variant.lines.length);
  let current = 0;
  if (timed || duration > 0) {
    variant.lines.forEach((_, i) => {
      if (time >= startOf(i)) current = i;
    });
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-line">
      <div className="relative flex h-[420px] flex-col p-5" style={{ background: `linear-gradient(${top}, ${bottom})` }}>
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={picture.imageUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent" aria-hidden />
          </>
        ) : (
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-28 w-full" aria-hidden>
          <path d="M0 64C70 34 150 40 220 58S340 30 400 46V120H0Z" fill="rgba(38,48,31,.18)" />
          <path d="M0 92C90 68 180 74 260 90S360 78 400 84V120H0Z" fill="rgba(38,48,31,.28)" />
        </svg>
        )}
        <div className="relative flex items-start justify-between gap-2">
          <p className={`pt-2 text-xs font-extrabold uppercase tracking-wider ${night ? "text-white/90" : "text-ink/70"}`}>
            Preview · {hasImage ? "picture" : scene}
          </p>
          <div className="flex gap-1.5">
            {hasImage && (
              <button
                type="button"
                onClick={picture.onRemove}
                disabled={picture.disabled}
                title="Remove picture (back to the scene)"
                aria-label="Remove picture"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-ink shadow backdrop-blur hover:bg-white disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
            <label
              title={hasImage ? "Change picture (JPG, PNG or WebP, about 1200×1500)" : "Add a picture (JPG, PNG or WebP, about 1200×1500)"}
              className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white/80 px-3 text-xs font-extrabold text-ink shadow backdrop-blur hover:bg-white ${
                picture.disabled ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <circle cx="9" cy="10" r="1.8" />
                <path d="M21 16l-5-5-9 9" />
              </svg>
              {picture.busy ? "Uploading…" : hasImage ? "Change" : "Add picture"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) picture.onPick(file);
                }}
              />
            </label>
          </div>
        </div>
        <div className="relative mx-auto mt-6 grid h-24 w-24 place-items-center" aria-hidden>
          <span className={`absolute inset-0 rounded-full border-2 border-dashed border-gold/70 ${playing ? "animate-spin [animation-duration:12s]" : ""}`} />
          <span className={`h-14 w-14 rounded-full bg-gold shadow-[0_0_40px_10px_rgba(227,199,113,.55)] ${playing ? "animate-pulse" : ""}`} />
        </div>
        <div className="relative mt-auto rounded-2xl bg-white/60 p-4 backdrop-blur-md">
          <p className="text-xs font-bold text-ink/60">{title}</p>
          <p className="mt-1 min-h-[3.5rem] font-serif text-lg leading-snug text-ink">{variant.lines[current]?.text}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 bg-card p-4">
        <button
          disabled={!variant.url}
          onClick={() => (playing ? audio.current?.pause() : audio.current?.play())}
          className="grid h-11 w-11 place-items-center rounded-full bg-ink text-bg disabled:opacity-30"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-olive-deep" style={{ width: `${duration ? Math.min(100, (time / duration) * 100) : 0}%` }} />
        </div>
        <span className="w-20 text-right text-xs tabular-nums text-muted">
          {fmtDuration(time)} / {fmtDuration(variant.durationSec)}
        </span>
        {variant.url && (
          <audio
            ref={audio}
            src={variant.url}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
        )}
      </div>
      {!variant.url && <p className="bg-card px-4 pb-4 text-xs text-muted">Add audio to play the preview. Lines advance with the voice.</p>}
    </div>
  );
}
