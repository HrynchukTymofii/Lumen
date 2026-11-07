import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Light } from "@/components/kit";
import { requirePageUser } from "@/lib/auth/current";
import { listBooks } from "@/lib/bible/passages";

export const metadata: Metadata = { title: "Books" };

const SECTIONS = [
  { key: "OT", title: "Old Testament" },
  { key: "DC", title: "Deuterocanonical" },
  { key: "NT", title: "New Testament" },
] as const;

// Book and chapter picker, as in the app: books by testament; each opens to its chapters; the book being read
// starts open (?at=John.3). The shelf button next to the title lists just the book names (?shelf=1); picking one
// shows only that book and its chapters (?book=Rev).
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
  const params = await searchParams;
  const at = typeof params.at === "string" ? params.at : undefined;
  const [curOsis, curChapter] = at ? at.split(".") : [];
  const shelf = params.shelf === "1";
  const only =
    typeof params.book === "string" && books.some((b) => b.osis === params.book)
      ? params.book
      : null;
  // Links within this page keep the reader's place (?at=) so ✕ still goes back to it
  const here = (extra: Record<string, string>) =>
    `/app/bible/books?${new URLSearchParams({ ...(at ? { at } : {}), ...extra })}`;

  return (
    <>
      <div className="wa-row">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 className="wa-h1">Books</h1>
          <Link
            href={
              shelf
                ? here(only ? { book: only } : {})
                : here({ shelf: "1", ...(only ? { book: only } : {}) })
            }
            className={`round-btn${shelf ? " on" : ""}`}
            aria-label="Choose a book"
            aria-expanded={shelf}
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M4 4h4v15H4zM10 6h4v13h-4zM15.5 7.2l3.4-.9 3.1 11.8-3.4.9zM2 21h20" />
            </svg>
          </Link>
        </div>
        <Link
          href={curOsis ? `/app/bible/${curOsis}/${curChapter}` : "/app/bible"}
          className="round-btn"
          aria-label="Close"
        >
          ✕
        </Link>
      </div>
      {shelf &&
        SECTIONS.map((s) => {
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
              <div className="book-shelf">
                {list.map((b) => (
                  <Link
                    key={b.id}
                    href={here({ book: b.osis })}
                    className={b.osis === (only ?? curOsis) ? "on" : ""}
                  >
                    {b.name}
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      {!shelf &&
        SECTIONS.map((s) => {
          const list = books.filter(
            (b) => b.testament === s.key && (!only || b.osis === only),
          );
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
                  <details
                    key={b.id}
                    className="book"
                    open={b.osis === (only ?? curOsis)}
                  >
                    <summary>
                      <b className={b.osis === curOsis ? "here" : ""}>
                        {b.name}
                      </b>
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
      {!shelf && only && (
        <section className="wa-sec">
          <Link
            href={here({})}
            className="wa-chip"
            style={{ display: "inline-block", textDecoration: "none" }}
          >
            All books
          </Link>
        </section>
      )}
    </>
  );
}
