"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/client";

// Quiet background music for the funnel (public/audio/funnel-background.mp3). Browsers only allow sound after a tap,
// so it starts with the first tap ("Start", or any tap after a refresh). It loops softly, almost goes silent while a
// prayer recording plays, and pauses while the tab is hidden. The button turns it off and remembers that.
// Volume goes through Web Audio, because iPhones ignore audio.volume.

const SRC = "/audio/funnel-background.mp3";
const VOLUME = 0.15;
const DUCKED = 0.02;
const KEY = "hh_music";

type Player = { el: HTMLAudioElement; ctx: AudioContext | null; gain: GainNode | null };

function readOn() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function useFunnelMusic() {
  const player = useRef<Player | null>(null);
  const ducked = useRef(false);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [on, setOn] = useState(readOn);
  const [ready, setReady] = useState(false); // the file loaded: only then is the button shown
  const onRef = useRef(on); // kept in step with `on` by toggle(), for the event handlers

  const sync = useCallback((seconds = 1.2) => {
    const p = player.current;
    if (!p) return;
    const target = !onRef.current || document.hidden ? 0 : ducked.current ? DUCKED : VOLUME;
    if (target > 0 && p.el.paused) {
      void p.ctx?.resume();
      p.el.play().catch(() => {});
    }
    if (p.gain && p.ctx) {
      const t = p.ctx.currentTime;
      const g = p.gain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(target, t + seconds);
    } else p.el.volume = target;
    clearTimeout(stopTimer.current);
    if (target === 0) stopTimer.current = setTimeout(() => p.el.pause(), seconds * 1000 + 100);
  }, []);

  /** Call from a tap. Safe to call again. */
  const start = useCallback(() => {
    if (player.current) return;
    const el = new Audio(SRC);
    el.loop = true;
    el.preload = "auto";
    let ctx: AudioContext | null = null;
    let gain: GainNode | null = null;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctx();
      gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(el).connect(gain).connect(ctx.destination);
    } catch {
      ctx = gain = null;
      el.volume = 0;
    }
    el.onloadedmetadata = () => setReady(true);
    el.onerror = () => setReady(false);
    player.current = { el, ctx, gain };
    sync(2.5);
  }, [sync]);

  // Prayer recordings anywhere on the page duck the music (media events don't bubble, so listen while capturing)
  useEffect(() => {
    const isOther = (e: Event) => e.target instanceof HTMLMediaElement && e.target !== player.current?.el;
    const play = (e: Event) => isOther(e) && ((ducked.current = true), sync(0.8));
    const stop = (e: Event) => isOther(e) && ((ducked.current = false), sync(1.5));
    const visibility = () => sync(0.4);
    document.addEventListener("play", play, true);
    document.addEventListener("pause", stop, true);
    document.addEventListener("ended", stop, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("play", play, true);
      document.removeEventListener("pause", stop, true);
      document.removeEventListener("ended", stop, true);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [sync]);

  // Leaving the funnel (to /success) stops it
  useEffect(
    () => () => {
      player.current?.el.pause();
      void player.current?.ctx?.close();
    },
    [],
  );

  const toggle = useCallback(() => {
    const next = !onRef.current;
    onRef.current = next;
    setOn(next);
    try {
      localStorage.setItem(KEY, next ? "on" : "off");
    } catch {}
    track("funnel_music_toggled", { on: next });
    sync(0.6);
  }, [sync]);

  return { on, ready, start, toggle };
}

export function MusicButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`fn-music ${on ? "" : "off"}`} onClick={onClick} aria-label={on ? "Turn music off" : "Turn music on"}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 6 6M22 9l-6 6" />}
      </svg>
    </button>
  );
}
