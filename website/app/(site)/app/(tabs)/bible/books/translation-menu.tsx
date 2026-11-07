"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TRANSLATIONS } from "@/lib/bible/translations";
import { post } from "../../../../_components/post";

// The translation button next to the Books title: lists the translations, saves the pick to the profile (like
// Settings) and reloads the page so the books and the reader follow it.
export function TranslationMenu({ current }: { current: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = TRANSLATIONS.find((t) => t.value === current)?.name ?? current;

  async function pick(value: string) {
    if (value === current) return setOpen(false);
    setSaving(value);
    setError(null);
    try {
      await post("/api/me", { translation: value }, "PATCH");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't change the translation",
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="tr-menu">
      <button
        type="button"
        className={`round-btn tr-btn${open ? " on" : ""}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Bible translation: ${name}`}
      >
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
        </svg>
        {current}
      </button>
      {open && (
        <div
          className="wa-card tr-list"
          role="listbox"
          aria-label="Bible translation"
        >
          {TRANSLATIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="option"
              aria-selected={t.value === current}
              onClick={() => pick(t.value)}
              disabled={saving !== null}
            >
              <span>{t.name}</span>
              {saving === t.value ? (
                <small>Saving…</small>
              ) : t.value === current ? (
                <b aria-hidden>✓</b>
              ) : null}
            </button>
          ))}
          {error && (
            <p className="fn-error" style={{ padding: "8px 20px 12px" }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
