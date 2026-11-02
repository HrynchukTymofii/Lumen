import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Light } from "@/components/kit";
import { requirePageUser } from "@/lib/auth/current";
import { bookByOsis } from "@/lib/bible/books";
import { getChapter } from "@/lib/bible/passages";
import { prisma } from "@/lib/prisma";
import type { HighlightColor, Mark } from "../../shared";
import { BookmarkButton, ChapterReader } from "./reader";

export async function generateMetadata({ params }: PageProps<"/app/bible/[book]/[chapter]">): Promise<Metadata> {
  const { book, chapter } = await params;
  return { title: `${bookByOsis.get(book.toLowerCase())?.name ?? book} ${chapter}` };
}

// The Bible reader (SPEC §10.1), like the app's: "John 3 ⌄" opens the book picker, the bookmark saves the chapter,
// tapping a verse opens highlight colors, Note, Copy, Share and Ask. Chapters before and after are a click away.
export default function ChapterPage(props: PageProps<"/app/bible/[book]/[chapter]">) {
  return (
    <Suspense fallback={<Light size={56} state="thinking" />}>
      <Chapter {...props} />
    </Suspense>
  );
}

async function Chapter({ params, searchParams }: PageProps<"/app/bible/[book]/[chapter]">) {
  const { book, chapter } = await params;
  const user = await requirePageUser(`/app/bible/${book}/${chapter}`);
  const n = Number(chapter);
  const data = Number.isInteger(n) && n > 0 ? await getChapter(user.translation, book, n) : null;
  if (!data) notFound();

  const osis = data.book.osis;
  const [rows, bookmark] = await Promise.all([
    prisma.bibleMark.findMany({ where: { userId: user.id, osis, chapter: n } }),
    prisma.bibleBookmark.findFirst({ where: { userId: user.id, osis, chapter: n }, select: { osis: true } }),
  ]);
  const marks: Record<number, Mark> = Object.fromEntries(
    rows.map((m) => [m.verse, { highlight: m.highlight, color: (m.color as HighlightColor | null) ?? null, note: m.note }]),
  );

  // ?v=16 or ?v=16-18: verses pointed to from elsewhere (a citation), tinted until something else is chosen
  const v = (await searchParams).v;
  const [from, to] = typeof v === "string" ? v.split("-").map(Number) : [];
  const pointed = from > 0 ? { from, to: to >= from ? to : from } : null;
  const title = `${data.book.name} ${n}`;

  return (
    <>
      <div className="wa-row">
        <h1 className="wa-h1">Bible</h1>
        <Link href="/app/bible/notes" className="round-btn" aria-label="Notes, highlights and bookmarks" title="Notes, highlights and bookmarks">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        </Link>
      </div>

      <div className="bible-bar">
        <Link href={`/app/bible/books?at=${osis}.${n}`} className="bible-title" aria-label={`${title}, choose a book and chapter`}>
          {title}
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </Link>
        <BookmarkButton key={`${osis}.${n}`} osis={osis} book={data.book.name} chapter={n} initial={Boolean(bookmark)} />
      </div>

      <ChapterReader key={`${osis}.${n}`} chapter={data} initialMarks={marks} pointed={pointed} aiEnabled={user.aiEnabled} />

      <nav className="bible-pager" aria-label="Chapters">
        {data.prev ? (
          <Link href={`/app/bible/${data.prev.osis}/${data.prev.chapter}`} className="btn-line">
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {data.next ? (
          <Link href={`/app/bible/${data.next.osis}/${data.next.chapter}`} className="btn-line">
            Next →
          </Link>
        ) : (
          <span className="fine">The end</span>
        )}
      </nav>
    </>
  );
}
