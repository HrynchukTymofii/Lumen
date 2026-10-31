"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { api, ApiError, CATEGORIES, SCENES, type Line, type Track, type Variant } from "../../../_lib/api";
import { Button, Card, ErrorBox, Field, StatusPill, fmtDuration, inputClass } from "../../../_lib/ui";
import { Preview } from "./preview";

type Me = { email: string; services: { r2: boolean; tts: boolean } };
type Form = {
  title: string;
  slug: string;
  subtitle: string;
  category: string;
  scene: string;
  tags: string;
  scriptureRefs: string;
  isPremium: boolean;
  publishAt: string;
  order: number;
  scripts: Record<number, string>; // minutes → one line per row
};

const LENGTHS = [1, 3, 5] as const;
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function toForm(t: Track): Form {
  return {
    title: t.title,
    slug: t.slug,
    subtitle: t.subtitle ?? "",
    category: t.category,
    scene: t.scene,
    tags: t.tags.join(", "),
    scriptureRefs: t.scriptureRefs.join(", "),
    isPremium: t.isPremium,
    publishAt: t.publishAt ? t.publishAt.slice(0, 16) : "",
    order: t.order,
    scripts: Object.fromEntries(t.variants.map((v) => [v.minutes, v.lines.map((l) => l.text).join("\n")])),
  };
}

// Rebuild variants from the textareas, keeping timings/audio for lines whose text didn't change.
function toVariants(track: Track, scripts: Form["scripts"]): Variant[] {
  return LENGTHS.filter((m) => scripts[m] !== undefined).map((minutes) => {
    const old = track.variants.find((v) => v.minutes === minutes);
    const texts = scripts[minutes].split("\n").map((l) => l.trim()).filter(Boolean);
    const lines: Line[] = texts.map((text, i) => ({ text, t: old?.lines[i]?.text === text ? old.lines[i].t : null }));
    return { minutes, url: old?.url ?? null, durationSec: old?.durationSec ?? null, lines };
  });
}

export function TrackEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [track, setTrack] = useState<Track | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<number>(3);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const accept = useCallback((t: Track) => {
    setTrack(t);
    setForm(toForm(t));
    setTab((cur) => (t.variants.some((v) => v.minutes === cur) ? cur : (t.variants[0]?.minutes ?? 3)));
  }, []);

  useEffect(() => {
    api<{ track: Track }>(`/api/admin/tracks/${id}`).then((r) => accept(r.track), (e) => setError(e));
    api<Me>("/api/admin/me").then(setMe, () => {});
  }, [id, accept]);

  async function run(label: string, fn: () => Promise<{ track: Track } | void>, done?: string) {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      const r = await fn();
      if (r?.track) accept(r.track);
      if (done) setNotice(done);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("Something went wrong", 500));
    } finally {
      setBusy(null);
    }
  }

  if (!track || !form) return error ? <ErrorBox message={error.message} /> : <p className="text-muted">Loading…</p>;

  const live = track.status === "published";
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(track));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v });
  const variant = track.variants.find((v) => v.minutes === tab);

  const save = () =>
    run(
      "save",
      () =>
        api(`/api/admin/tracks/${id}`, {
          method: "PATCH",
          body: {
            title: form.title,
            slug: form.slug,
            subtitle: form.subtitle || null,
            category: form.category,
            scene: form.scene,
            tags: list(form.tags),
            scriptureRefs: list(form.scriptureRefs),
            isPremium: form.isPremium,
            publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
            order: Number(form.order) || 0,
            variants: toVariants(track, form.scripts),
          },
        }),
      "Saved.",
    );

  async function upload(file: File) {
    await run(
      "upload",
      async () => {
        const presigned = await api<{ uploadUrl: string; publicUrl: string; headers: Record<string, string> }>(
          "/api/admin/uploads",
          { method: "POST", body: { trackId: id, minutes: tab, contentType: "audio/mpeg" } },
        );
        const put = await fetch(presigned.uploadUrl, { method: "PUT", headers: presigned.headers, body: file });
        if (!put.ok) throw new ApiError(`Upload to R2 failed (${put.status}). Check the bucket's CORS rules.`, put.status);
        const durationSec = await readDuration(file);
        const variants = track!.variants.map((v) =>
          v.minutes === tab ? { ...v, url: presigned.publicUrl, durationSec, lines: v.lines.map((l) => ({ ...l, t: null })) } : v,
        );
        return api(`/api/admin/tracks/${id}`, { method: "PATCH", body: { variants } });
      },
      "Audio uploaded.",
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/tracks" className="text-sm font-bold text-muted hover:text-ink">
          ← Prayers
        </Link>
        <StatusPill status={track.status} scheduled={Boolean(track.publishAt && new Date(track.publishAt) > new Date())} />
        {track.source === "ai" && <span className="rounded-full bg-lav px-2.5 py-0.5 text-xs font-extrabold">AI draft</span>}
        <span className="text-sm text-muted">
          {track.reviewedBy ? `Reviewed by ${track.reviewedBy}` : "Not reviewed yet"}
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold">{track.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="line" onClick={save} disabled={!dirty || busy !== null}>
            {busy === "save" ? "Saving…" : "Save"}
          </Button>
          {!live && (
            <Button
              variant="line"
              disabled={dirty || busy !== null}
              title={dirty ? "Save first" : undefined}
              onClick={() =>
                run("review", () => api(`/api/admin/tracks/${id}`, { method: "PATCH", body: { reviewed: !track.reviewedBy } }))
              }
            >
              {track.reviewedBy ? "Unmark reviewed" : "Mark reviewed"}
            </Button>
          )}
          {live ? (
            <Button variant="line" disabled={busy !== null} onClick={() => run("pub", () => api(`/api/admin/tracks/${id}/publish`, { method: "DELETE" }), "Unpublished. It disappears from the app on next launch.")}>
              Unpublish
            </Button>
          ) : (
            <Button disabled={dirty || busy !== null} onClick={() => run("pub", () => api(`/api/admin/tracks/${id}/publish`, { method: "POST" }), "Published. The app picks it up on next launch.")}>
              Publish
            </Button>
          )}
        </div>
      </div>

      {live && (
        <p className="rounded-2xl bg-olive/40 px-4 py-3 text-sm">
          This prayer is live. You can change details like title or premium, but to change the words, unpublish it first
          (the audio has to match the text).
        </p>
      )}
      {notice && <p className="rounded-2xl bg-sage px-4 py-3 text-sm font-bold">{notice}</p>}
      <ErrorBox message={error?.message ?? null} problems={error?.problems} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title">
                <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Slug" hint="Used in links. Lowercase words with dashes.">
                <input value={form.slug} onChange={(e) => set("slug", e.target.value)} className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Subtitle">
                  <input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} className={inputClass} />
                </Field>
              </div>
              <Field label="Category">
                <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Scene" hint="The illustration behind the player. New scenes need an app update.">
                <select value={form.scene} onChange={(e) => set("scene", e.target.value)} className={inputClass}>
                  {SCENES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tags" hint="Comma separated">
                <input value={form.tags} onChange={(e) => set("tags", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Scripture" hint="e.g. Phil.4.6-7, Ps.23.1">
                <input value={form.scriptureRefs} onChange={(e) => set("scriptureRefs", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Release" hint="Empty = as soon as it's published">
                <input type="datetime-local" value={form.publishAt} onChange={(e) => set("publishAt", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Order" hint="Lower comes first in the library">
                <input type="number" value={form.order} onChange={(e) => set("order", Number(e.target.value))} className={inputClass} />
              </Field>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={form.isPremium} onChange={(e) => set("isPremium", e.target.checked)} className="h-4 w-4 accent-olive-deep" />
                Premium only
              </label>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-2 font-display text-xl font-semibold">Script</h2>
              {LENGTHS.map((m) => {
                const exists = form.scripts[m] !== undefined;
                return (
                  <button
                    key={m}
                    onClick={() => (exists ? setTab(m) : (set("scripts", { ...form.scripts, [m]: "" }), setTab(m)))}
                    disabled={live && !exists}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-bold disabled:opacity-40 ${
                      tab === m && exists ? "bg-olive" : exists ? "bg-bg" : "border border-dashed border-line-2 text-muted"
                    }`}
                  >
                    {exists ? `${m} min` : `+ ${m} min`}
                  </button>
                );
              })}
              {form.scripts[tab] !== undefined && !live && (
                <button
                  className="ml-auto text-sm font-bold text-danger"
                  onClick={() => {
                    const rest = { ...form.scripts };
                    delete rest[tab];
                    set("scripts", rest);
                  }}
                >
                  Remove this length
                </button>
              )}
            </div>
            {form.scripts[tab] !== undefined ? (
              <>
                <textarea
                  value={form.scripts[tab]}
                  onChange={(e) => set("scripts", { ...form.scripts, [tab]: e.target.value })}
                  readOnly={live}
                  rows={14}
                  className={`${inputClass} mt-4 font-serif text-base leading-relaxed`}
                  placeholder={"One line per row. Each row is shown on its own in the player.\nLord, …"}
                />
                <p className="mt-2 text-xs text-muted">
                  {form.scripts[tab].split("\n").filter((l) => l.trim()).length} lines · about{" "}
                  {Math.round(form.scripts[tab].split(/\s+/).filter(Boolean).length / 130 * 10) / 10} min spoken. Changing the words
                  removes the old audio and the review.
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted">Pick a length above.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-xl font-semibold">Audio · {tab} min</h2>
            {variant?.url ? (
              <p className="mt-1 text-sm text-muted">Ready · {fmtDuration(variant.durationSec)}</p>
            ) : (
              <p className="mt-1 text-sm text-muted">{variant ? "No audio yet." : "Save this length first."}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="olive"
                disabled={!variant || live || dirty || busy !== null || !me?.services.tts || !me?.services.r2}
                title={!me?.services.tts ? "Add the ElevenLabs keys to .env" : dirty ? "Save first" : undefined}
                onClick={() =>
                  run("tts", () => api(`/api/admin/tracks/${id}/tts`, { method: "POST", body: { minutes: tab } }), "Voice generated.")
                }
              >
                {busy === "tts" ? "Generating…" : variant?.url ? "Regenerate voice" : "Generate voice"}
              </Button>
              <label
                className={`inline-flex h-10 cursor-pointer items-center rounded-full border-[1.5px] border-line-2 px-5 text-sm font-extrabold ${
                  !variant || live || dirty || busy !== null || !me?.services.r2 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                {busy === "upload" ? "Uploading…" : "Upload MP3"}
                <input
                  type="file"
                  accept="audio/mpeg"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                />
              </label>
            </div>
            {me && (!me.services.r2 || !me.services.tts) && (
              <p className="mt-3 text-xs text-muted">
                {!me.services.r2 && "R2 isn't set up yet. "}
                {!me.services.tts && "ElevenLabs isn't set up yet. "}
                Fill the keys in <code>website/.env</code>.
              </p>
            )}
          </Card>

          {variant && <Preview key={`${tab}-${variant.url}`} variant={variant} scene={track.scene} title={track.title} />}

          {!live && (
            <button
              className="text-sm font-bold text-danger"
              onClick={() =>
                confirmDelete() &&
                run("delete", async () => {
                  await api(`/api/admin/tracks/${id}`, { method: "DELETE" });
                  window.location.href = "/admin/tracks";
                })
              }
            >
              Delete prayer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// window.confirm is fine for an internal tool
const confirmDelete = () => window.confirm("Delete this prayer? Drafts are removed; anything used in a path is archived.");

function readDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? Math.ceil(audio.duration) : null);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = () => resolve(null);
    audio.src = URL.createObjectURL(file);
  });
}
