"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, CATEGORIES, slugify, type Track, type TrackRow } from "../../_lib/api";
import { Button, Card, ErrorBox, Field, StatusPill, inputClass } from "../../_lib/ui";

export function TrackList() {
  const router = useRouter();
  const params = useSearchParams();
  const [tracks, setTracks] = useState<TrackRow[] | null>(null);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(params.get("new") === "1");

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (category) qs.set("category", category);
    if (q) qs.set("q", q);
    api<{ tracks: TrackRow[] }>(`/api/admin/tracks?${qs}`).then((r) => setTracks(r.tracks), () => setTracks([]));
  }, [status, category, q]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold">Prayers</h1>
        <Button onClick={() => setCreating(true)}>New prayer</Button>
      </div>

      {creating && <NewTrack onCancel={() => setCreating(false)} onCreated={(id) => router.push(`/admin/tracks/${id}`)} />}

      <div className="grid gap-3 sm:grid-cols-[1fr_220px_220px]">
        <input placeholder="Search titles" value={q} onChange={(e) => setQ(e.target.value)} className={inputClass} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
          <option value="">All (not archived)</option>
          {["draft", "review", "published", "archived"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-line bg-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-5 py-3">Title</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Scene</th>
              <th className="px-3 py-3">Lengths · audio</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Premium</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tracks?.map((t) => (
              <tr key={t.id} className="hover:bg-bg">
                <td className="px-5 py-3">
                  <Link href={`/admin/tracks/${t.id}`} className="font-bold hover:text-olive-deep">
                    {t.title}
                  </Link>
                  <div className="text-xs text-muted">{t.slug}</div>
                </td>
                <td className="px-3 py-3">{t.category}</td>
                <td className="px-3 py-3">{t.scene}</td>
                <td className="px-3 py-3">
                  {t.variants.length === 0 && <span className="text-muted">none</span>}
                  <span className="flex gap-1.5">
                    {t.variants.map((v) => (
                      <span
                        key={v.minutes}
                        title={v.hasAudio ? "has audio" : "no audio yet"}
                        className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${v.hasAudio ? "bg-olive" : "bg-line text-muted"}`}
                      >
                        {v.minutes}m
                      </span>
                    ))}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <StatusPill status={t.status} scheduled={Boolean(t.publishAt && new Date(t.publishAt) > new Date())} />
                </td>
                <td className="px-3 py-3">{t.isPremium ? "Premium" : "Free"}</td>
              </tr>
            ))}
            {tracks?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted">
                  No prayers yet. Create one, or run <code>npm run prayers:generate</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewTrack({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("peace");
  const [error, setError] = useState<ApiError | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { track } = await api<{ track: Track }>("/api/admin/tracks", {
        method: "POST",
        body: {
          title,
          slug: slugify(title),
          category,
          source: "human",
          variants: [{ minutes: 3, url: null, durationSec: null, lines: [{ t: null, text: "Lord, …" }] }],
        },
      });
      onCreated(track.id);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Something went wrong", 500));
    }
  }

  return (
    <Card>
      <form onSubmit={create} className="grid gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
        <Field label="Title">
          <input required minLength={2} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} autoFocus />
        </Field>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <div className="flex gap-2">
          <Button type="submit">Create</Button>
          <Button type="button" variant="line" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
      <div className="mt-3">
        <ErrorBox message={error?.message ?? null} problems={error?.problems} />
      </div>
    </Card>
  );
}
