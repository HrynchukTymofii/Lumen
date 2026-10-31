"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, slugify, type Status } from "../../_lib/api";
import { Button, Card, ErrorBox, Field, StatusPill, inputClass } from "../../_lib/ui";

type PathRow = { id: string; slug: string; title: string; status: Status; isPremium: boolean; _count: { days: number } };

export default function PathsPage() {
  const router = useRouter();
  const [paths, setPaths] = useState<PathRow[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ paths: PathRow[] }>("/api/admin/paths").then((r) => setPaths(r.paths), () => setPaths([]));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { path } = await api<{ path: PathRow }>("/api/admin/paths", {
        method: "POST",
        body: { title, slug: slugify(title) },
      });
      router.push(`/admin/paths/${path.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">Prayer paths</h1>
        <p className="mt-1 text-muted">Multi-day series, like a playlist: one published prayer per day.</p>
      </div>

      <Card>
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <div className="min-w-60 flex-1">
            <Field label="New path">
              <input required minLength={2} placeholder="7 Days of Peace" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Button type="submit">Create</Button>
        </form>
        <div className="mt-3">
          <ErrorBox message={error} />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paths?.map((p) => (
          <Link key={p.id} href={`/admin/paths/${p.id}`} className="rounded-3xl bg-sage p-5 transition hover:brightness-95">
            <StatusPill status={p.status} />
            <div className="mt-3 font-display text-2xl font-semibold">{p.title}</div>
            <div className="mt-1 text-sm font-bold">
              {p._count.days} days · {p.isPremium ? "Premium" : "Free"}
            </div>
          </Link>
        ))}
        {paths?.length === 0 && <p className="text-muted">No paths yet.</p>}
      </div>
    </div>
  );
}
