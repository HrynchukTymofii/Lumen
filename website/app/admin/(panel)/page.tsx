"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type TrackRow } from "../_lib/api";
import { Card, StatusPill } from "../_lib/ui";

type Me = { email: string; contentVersion: number; services: { r2: boolean; tts: boolean } };

export default function AdminOverview() {
  const [me, setMe] = useState<Me | null>(null);
  const [tracks, setTracks] = useState<TrackRow[] | null>(null);

  useEffect(() => {
    api<Me>("/api/admin/me").then(setMe, () => {});
    api<{ tracks: TrackRow[] }>("/api/admin/tracks").then((r) => setTracks(r.tracks), () => {});
  }, []);

  const count = (s: string) => tracks?.filter((t) => t.status === s).length ?? "–";
  const queue = tracks?.filter((t) => t.status !== "published" && !t.reviewedBy) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Library</h1>
          <p className="mt-1 text-muted">
            Everything published here appears in the app on its next launch. No app release needed.
          </p>
        </div>
        <Link href="/admin/tracks?new=1" className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-extrabold text-bg">
          New prayer
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Published", count("published"), "bg-olive"],
          ["In review", count("review"), "bg-butter"],
          ["Drafts", count("draft"), "bg-sage"],
          ["Catalog version", me?.contentVersion ?? "–", "bg-sky"],
        ].map(([label, value, bg]) => (
          <div key={label} className={`rounded-3xl p-5 ${bg}`}>
            <div className="font-display text-4xl font-semibold">{value}</div>
            <div className="mt-1 text-sm font-bold">{label}</div>
          </div>
        ))}
      </div>

      {me && (!me.services.r2 || !me.services.tts) && (
        <Card className="border-gold bg-butter/40">
          <b className="font-extrabold">Setup still needed</b>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {!me.services.r2 && <li>Cloudflare R2: fill the <code>R2_*</code> values in <code>website/.env</code> to store audio.</li>}
            {!me.services.tts && <li>ElevenLabs: fill <code>ELEVENLABS_API_KEY</code> and <code>ELEVENLABS_VOICE_ID</code> to generate voices.</li>}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="font-display text-xl font-semibold">Needs review ({queue.length})</h2>
        <p className="text-sm text-muted">Nothing goes live until a person has read it.</p>
        <ul className="mt-4 divide-y divide-line">
          {queue.slice(0, 12).map((t) => (
            <li key={t.id}>
              <Link href={`/admin/tracks/${t.id}`} className="flex items-center gap-3 py-3 hover:text-olive-deep">
                <StatusPill status={t.status} />
                <span className="font-bold">{t.title}</span>
                <span className="text-sm text-muted">{t.category}</span>
                {t.source === "ai" && <span className="ml-auto text-xs font-bold text-muted">AI draft</span>}
              </Link>
            </li>
          ))}
          {tracks && queue.length === 0 && <li className="py-3 text-sm text-muted">All caught up.</li>}
        </ul>
      </Card>
    </div>
  );
}
