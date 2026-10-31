import { SiteFooter, SiteNav } from "./chrome";

// Shared frame for the legal and help pages
export function DocPage({
  eyebrow,
  title,
  updated,
  toc,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  toc?: [id: string, label: string][];
  children: React.ReactNode;
}) {
  return (
    <main className="wrap">
      <SiteNav />
      <article className="doc">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {updated && <p className="meta">Last updated: {updated}</p>}
        {toc && (
          <ul className="toc" aria-label="On this page">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        )}
        {children}
      </article>
      <SiteFooter />
    </main>
  );
}
