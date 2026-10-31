"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../_lib/api";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/tracks", label: "Prayers" },
  { href: "/admin/paths", label: "Paths" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    api<{ email: string }>("/api/admin/me").then((me) => setEmail(me.email), () => {});
  }, []);

  async function logout() {
    await api("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <header className="border-b border-line bg-bg">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/admin" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="h-5 w-5 rounded-full bg-gold ring-4 ring-gold/25" aria-hidden />
          Lumen admin
        </Link>
        <nav className="flex gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${active ? "bg-olive text-ink" : "text-muted hover:text-ink"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-muted">
          {email && <span className="hidden sm:inline">{email}</span>}
          <button onClick={logout} className="font-bold text-ink underline-offset-4 hover:underline">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
