"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = (d: React.ReactNode) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

const TABS = [
  { href: "/app", label: "Today", icon: icon(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>) },
  { href: "/app/prayers", label: "Prayers", icon: icon(<path d="M2 4h6a4 4 0 014 4v13a3 3 0 00-3-3H2zM22 4h-6a4 4 0 00-4 4v13a3 3 0 013-3h7z" />) },
  { href: "/app/companion", label: "Companion", icon: icon(<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />) },
  { href: "/app/settings", label: "Settings", icon: icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>) },
];

export function TabNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));
  return (
    <nav className="wa-tabs" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={active(t.href) ? "on" : ""} aria-current={active(t.href) ? "page" : undefined}>
          <span className="ic">{t.icon}</span>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
