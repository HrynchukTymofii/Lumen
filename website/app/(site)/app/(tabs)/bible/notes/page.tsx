import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowIcon, Light } from "@/components/kit";
import { requirePageUser } from "@/lib/auth/current";
import { prisma } from "@/lib/prisma";
import { highlightVar } from "../shared";

export const metadata: Metadata = { title: "Notes & highlights" };

// Notes, highlights and bookmarks, made here or in the app (they're kept on the account).
export default function NotesPage() {
  return (
    <>
      <div className="wa-row">
        <h1 className="wa-h1">Notes &amp; highlights</h1>
        <Link href="/app/bible" className="round-btn" aria-label="Back to the Bible">
          ✕
        </Link>
      </div>
      <Suspense fallback={<Light size={56} state="thinking" />}>
        <Notes />
      </Suspense>
    </>
  );
}

async function Notes() {
  const user = await requirePageUser("/app/bible/notes");
  const [marks, bookmarks] = await Promise.all([
    prisma.bibleMark.findMany({ where: { userId: user.id, OR: [{ highlight: true }, { note: { not: "" } }] }, orderBy: { updatedAt: "desc" } }),
    prisma.bibleBookmark.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!marks.length && !bookmarks.length) {
    return (
      <div className="wa-card wa-empty wa-sec">
        <Light size={56} />
        <p style={{ marginTop: 10 }}>Click a verse in the Bible to highlight it or write a note. Bookmarked chapters show here too.</p>
        <Link href="/app/bible" className="btn-line" style={{ marginTop: 16 }}>
          Open the Bible
        </Link>
      </div>
    );
  }

  return (
    <>
      {bookmarks.length > 0 && (
        <section className="wa-sec">
          <h2>Bookmarks</h2>
          <div className="wa-card wa-list">
            {bookmarks.map((b) => (
              <Link key={`${b.osis}.${b.chapter}`} href={`/app/bible/${b.osis}/${b.chapter}`} className="wa-list-row">
                <b>
                  {b.book} {b.chapter}
                </b>
                <ArrowIcon size={18} />
              </Link>
            ))}
          </div>
        </section>
      )}
      {marks.length > 0 && (
        <section className="wa-sec">
          <h2>Highlights &amp; notes</h2>
          <div className="mark-list">
            {marks.map((m) => (
              <Link key={`${m.osis}.${m.chapter}.${m.verse}`} href={`/app/bible/${m.osis}/${m.chapter}?v=${m.verse}`} className="wa-card mark-card">
                <span className="eyebrow" style={{ color: "var(--muted)" }}>
                  {m.book} {m.chapter}:{m.verse} · {m.translation}
                </span>
                <q style={m.highlight ? { background: highlightVar(m.color), color: "var(--on-pastel)" } : undefined}>{m.text}</q>
                {m.note && <p>{m.note}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
