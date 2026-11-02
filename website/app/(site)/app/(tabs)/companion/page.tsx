import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowIcon, Light } from "@/components/kit";
import { getQuota } from "@/lib/ai/companion";
import { requirePageUser } from "@/lib/auth/current";
import { listConversations } from "@/lib/chat";
import { getPremium } from "@/lib/entitlement";
import { StartChat } from "./start-chat";

export const metadata: Metadata = { title: "Companion" };

// Companion (SPEC §10.2), as in the app: new conversation, quick prompts, earlier conversations, today's allowance.
export default function CompanionPage() {
  return (
    <Suspense fallback={<Light size={56} state="thinking" />}>
      <Companion />
    </Suspense>
  );
}

function when(d: Date, timeZone: string) {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "long", timeZone });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone });
}

async function Companion() {
  const user = await requirePageUser("/app/companion");

  if (!user.aiEnabled) {
    return (
      <>
        <h1 className="wa-h1">Companion</h1>
        <div className="wa-card wa-empty wa-sec">
          <Light size={72} />
          <h2 style={{ fontSize: 22, marginTop: 12, color: "var(--ink)" }}>The companion is turned off</h2>
          <p style={{ marginTop: 6 }}>You can turn it back on in Settings.</p>
          <Link href="/app/settings" className="btn-line" style={{ marginTop: 16 }}>
            Open Settings
          </Link>
        </div>
      </>
    );
  }

  const premium = Boolean(await getPremium(user.id));
  const [{ conversations }, quota] = await Promise.all([listConversations(user.id), getQuota(user, premium)]);
  // A conversation gets its title from the first message; ones left empty are hidden
  const earlier = conversations.filter((c) => c.title);
  const left = premium ? null : Math.max(0, quota.limit - quota.used);

  return (
    <>
      <div className="wa-row">
        <div>
          <h1 className="wa-h1">Companion</h1>
          <p className="wa-lead">Ask about the Bible, or ask for a prayer.</p>
        </div>
        <Light size={56} />
      </div>

      <StartChat />
      {left !== null && (
        <p className="wa-lead" style={{ textAlign: "center", fontSize: 14 }}>
          {left} of {quota.limit} messages left today
          {left === 0 && (
            <>
              {" · "}
              <Link href="/app/upgrade">Keep talking with Premium</Link>
            </>
          )}
        </p>
      )}

      {earlier.length > 0 && (
        <section className="wa-sec">
          <div className="wa-card wa-list">
            <span className="eyebrow" style={{ color: "var(--muted)" }}>
              Earlier
            </span>
            {earlier.map((c) => (
              <Link key={c.id} href={`/app/companion/${c.id}`} className="wa-list-row">
                <span>
                  <b>{c.title}</b>
                  <small>{when(c.updatedAt, user.timezone)}</small>
                </span>
                <ArrowIcon size={18} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="fine" style={{ textAlign: "center", marginTop: 26 }}>
        The companion is an AI. It can make mistakes and isn&apos;t a pastor, counselor or doctor.
      </p>
    </>
  );
}
