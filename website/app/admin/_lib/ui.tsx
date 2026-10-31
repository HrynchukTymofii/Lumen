"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Status } from "./api";

export function Button({
  variant = "ink",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "ink" | "line" | "olive" | "danger" }) {
  const styles = {
    ink: "bg-ink text-bg hover:bg-ink/90",
    olive: "bg-olive text-ink hover:brightness-95",
    line: "border-[1.5px] border-line-2 bg-card text-ink hover:bg-bg",
    danger: "border-[1.5px] border-danger/30 bg-card text-danger hover:bg-danger/5",
  }[variant];
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-extrabold transition disabled:pointer-events-none disabled:opacity-40 ${styles} ${className}`}
      {...props}
    />
  );
}

const STATUS_STYLE: Record<Status, string> = {
  draft: "bg-line text-muted",
  review: "bg-butter text-ink",
  published: "bg-olive text-ink",
  archived: "bg-rose text-ink",
};

export function StatusPill({ status, scheduled }: { status: Status; scheduled?: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-extrabold ${STATUS_STYLE[status]}`}>
      {status === "published" && scheduled ? "scheduled" : status}
    </span>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border-[1.5px] border-line-2 bg-card px-3.5 py-2.5 text-sm text-ink outline-none focus:border-olive-deep";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line bg-card p-6 ${className}`}>{children}</div>;
}

export function ErrorBox({ message, problems }: { message: string | null; problems?: string[] }) {
  if (!message) return null;
  return (
    <div className="rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
      <b className="font-extrabold">{message}</b>
      {problems && problems.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const fmtDuration = (s: number | null) =>
  s == null ? "–" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
