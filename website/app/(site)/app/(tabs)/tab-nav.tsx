"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = (d: React.ReactNode) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

// Same tabs as the phone app: Today · Discover · Bible · Companion, plus Settings
const TABS = [
  { href: "/app", label: "Today", icon: icon(<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" />) },
  { href: "/app/discover", label: "Discover", icon: icon(<><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>), also: ["/app/prayers"] },
  { href: "/app/bible", label: "Bible", icon: icon(<path d="M2 4h6a4 4 0 014 4v13a3 3 0 00-3-3H2zM22 4h-6a4 4 0 00-4 4v13a3 3 0 013-3h7z" />) },
  { href: "/app/companion", label: "Companion", icon: icon(<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />) },
  { href: "/app/settings", label: "Settings", icon: icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>), also: ["/app/upgrade"] },
];

export function TabNav() {
  const path = usePathname();
  const active = (href: string, also: string[] = []) =>
    href === "/app" ? path === "/app" : [href, ...also].some((h) => path === h || path.startsWith(`${h}/`));
  return (
    <nav className="wa-tabs" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={active(t.href, t.also) ? "on" : ""} aria-current={active(t.href, t.also) ? "page" : undefined}>
          <span className="ic">{t.icon}</span>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
