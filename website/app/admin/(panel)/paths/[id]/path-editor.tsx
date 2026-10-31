"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { api, ApiError, SCENES, type Status, type TrackRow } from "../../../_lib/api";
import { Button, Card, ErrorBox, Field, StatusPill, inputClass } from "../../../_lib/ui";

type DayTrack = { id: string; title: string; status: Status; category: string };
type Path = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  scene: string;
  isPremium: boolean;
  status: Status;
  days: { day: number; track: DayTrack }[];
};

export function PathEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [path, setPath] = useState<Path | null>(null);
  const [days, setDays] = useState<DayTrack[]>([]);
  const [meta, setMeta] = useState({ title: "", subtitle: "", scene: "dawn", isPremium: true });
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [pick, setPick] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function accept(p: Path) {
    setPath(p);
    setDays(p.days.map((d) => d.track));
    setMeta({ title: p.title, subtitle: p.subtitle ?? "", scene: p.scene, isPremium: p.isPremium });
  }

  useEffect(() => {
    api<{ path: Path }>(`/api/admin/paths/${id}`).then((r) => accept(r.path), setError);
    api<{ tracks: TrackRow[] }>("/api/admin/tracks").then((r) => setTracks(r.tracks), () => {});
  }, [id]);

  async function run(fn: () => Promise<{ path: Path }>, done: string) {
    setError(null);
    setNotice(null);
    try {
      accept((await fn()).path);
      setNotice(done);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("Something went wrong", 500));
    }
  }

  if (!path) return error ? <ErrorBox message={error.message} /> : <p className="text-muted">Loading…</p>;

  const move = (i: number, by: number) => {
    const next = [...days];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item);
    setDays(next);
  };

  const save = () =>
    run(
      () =>
        api(`/api/admin/paths/${id}`, {
          method: "PATCH",
          body: { ...meta, subtitle: meta.subtitle || null, trackIds: days.map((d) => d.id) },
        }),
      "Saved.",
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/paths" className="text-sm font-bold text-muted hover:text-ink">
          ← Paths
        </Link>
        <StatusPill status={path.status} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold">{path.title}</h1>
        <div className="flex gap-2">
          <Button variant="line" onClick={save}>
            Save
          </Button>
          {path.status === "published" ? (
            <Button variant="line" onClick={() => run(() => api(`/api/admin/paths/${id}/publish`, { method: "DELETE" }), "Unpublished.")}>
              Unpublish
            </Button>
          ) : (
            <Button onClick={() => run(() => api(`/api/admin/paths/${id}/publish`, { method: "POST" }), "Published.")}>Publish</Button>
          )}
        </div>
      </div>

      {notice && <p className="rounded-2xl bg-sage px-4 py-3 text-sm font-bold">{notice}</p>}
      <ErrorBox message={error?.message ?? null} problems={error?.problems} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <h2 className="font-display text-xl font-semibold">Days</h2>
          <ol className="mt-4 space-y-2">
            {days.map((t, i) => (
              <li key={`${t.id}-${i}`} className="flex items-center gap-3 rounded-2xl bg-bg px-4 py-3">
                <span className="w-14 text-xs font-extrabold uppercase text-muted">Day {i + 1}</span>
                <span className="flex-1 font-bold">{t.title}</span>
                <StatusPill status={t.status} />
                <button disabled={i === 0} onClick={() => move(i, -1)} className="px-1 disabled:opacity-30" aria-label="Move up">
                  ↑
                </button>
                <button disabled={i === days.length - 1} onClick={() => move(i, 1)} className="px-1 disabled:opacity-30" aria-label="Move down">
                  ↓
                </button>
                <button onClick={() => setDays(days.filter((_, j) => j !== i))} className="px-1 text-danger" aria-label="Remove">
                  ✕
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex gap-2">
            <select value={pick} onChange={(e) => setPick(e.target.value)} className={inputClass}>
              <option value="">Add a prayer…</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.status})
                </option>
              ))}
            </select>
            <Button
              variant="olive"
              disabled={!pick}
              onClick={() => {
                const t = tracks.find((x) => x.id === pick);
                if (t) setDays([...days, { id: t.id, title: t.title, status: t.status, category: t.category }]);
                setPick("");
              }}
            >
              Add
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">Every day&apos;s prayer must be published before the path can be.</p>
        </Card>

        <Card className="space-y-4">
          <Field label="Title">
            <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Subtitle">
            <input value={meta.subtitle} onChange={(e) => setMeta({ ...meta, subtitle: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Scene">
            <select value={meta.scene} onChange={(e) => setMeta({ ...meta, scene: e.target.value })} className={inputClass}>
              {SCENES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={meta.isPremium} onChange={(e) => setMeta({ ...meta, isPremium: e.target.checked })} className="h-4 w-4 accent-olive-deep" />
            Premium only
          </label>
        </Card>
      </div>
    </div>
  );
}
