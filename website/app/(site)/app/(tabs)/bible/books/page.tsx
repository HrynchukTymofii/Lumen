import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Light } from "@/components/kit";
import { requirePageUser } from "@/lib/auth/current";
import { listBooks } from "@/lib/bible/passages";
import { TranslationMenu } from "./translation-menu";

export const metadata: Metadata = { title: "Books" };

const SECTIONS = [
  { key: "OT", title: "Old Testament" },
  { key: "DC", title: "Deuterocanonical" },
  { key: "NT", title: "New Testament" },
] as const;

// Book and chapter picker, as in the app: all books of the user's translation by testament; each opens to its
// chapters; the book being read starts open (?at=John.3). The translation button next to the title switches the
// translation (saved to the profile) and the list follows it.
export default function BooksPage(props: PageProps<"/app/bible/books">) {
  return (
    <Suspense fallback={<Light size={56} state="thinking" />}>
      <Books {...props} />
    </Suspense>
  );
}

async function Books({ searchParams }: PageProps<"/app/bible/books">) {
  const user = await requirePageUser("/app/bible/books");
  const books = await listBooks(user.translation);
  const at = (await searchParams).at;
  const [curOsis, curChapter] = typeof at === "string" ? at.split(".") : [];

  return (
    <>
      <div className="wa-row" style={{ flexWrap: "nowrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 className="wa-h1">Books</h1>
          <TranslationMenu current={user.translation} />
        </div>
        <Link
          href={curOsis ? `/app/bible/${curOsis}/${curChapter}` : "/app/bible"}
          className="round-btn"
          aria-label="Close"
        >
          ✕
        </Link>
      </div>
      {SECTIONS.map((s) => {
        const list = books.filter((b) => b.testament === s.key);
        if (!list.length) return null;
        return (
          <section key={s.key} className="wa-sec">
            <span
              className="eyebrow"
              style={{
                color: "var(--muted)",
                display: "block",
                marginBottom: 8,
              }}
            >
              {s.title}
            </span>
            <div className="wa-card wa-list" style={{ padding: 0 }}>
              {list.map((b) => (
                <details key={b.id} className="book" open={b.osis === curOsis}>
                  <summary>
                    <b className={b.osis === curOsis ? "here" : ""}>{b.name}</b>
                    <small>{b.chapters}</small>
                  </summary>
                  <div className="chapters">
                    {Array.from({ length: b.chapters }, (_, i) => i + 1).map(
                      (n) => (
                        <Link
                          key={n}
                          href={`/app/bible/${b.osis}/${n}`}
                          className={
                            b.osis === curOsis && String(n) === curChapter
                              ? "on"
                              : ""
                          }
                          aria-label={`${b.name} ${n}`}
                        >
                          {n}
                        </Link>
                      ),
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
