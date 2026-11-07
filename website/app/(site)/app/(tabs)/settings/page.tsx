import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Light } from "@/components/kit";
import { requirePageUser } from "@/lib/auth/current";
import { getPremium } from "@/lib/entitlement";
import { planOf } from "@/lib/plans";
import { ProfileForm, AccountActions } from "./settings-client";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <h1 className="wa-h1">Settings</h1>
      <Suspense fallback={<Light size={56} state="thinking" />}>
        <Settings />
      </Suspense>
    </>
  );
}

const STATUS = {
  trial: "Free trial",
  active: "Active",
  grace: "Payment problem",
  canceled: "Cancelled, access until",
  expired: "Expired",
};

async function Settings() {
  const user = await requirePageUser("/app/settings");
  const premium = await getPremium(user.id);
  const plan = premium ? planOf(premium.productId) : null;
  const until = premium?.currentPeriodEnd.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <section className="wa-sec">
        <h2>Profile</h2>
        <div className="wa-card">
          <p className="wa-lead" style={{ marginTop: 0 }}>
            Signed in as <b>{user.email}</b>
          </p>
          <ProfileForm
            firstName={user.firstName ?? ""}
            denomination={user.denomination ?? ""}
            translation={user.translation}
          />
        </div>
      </section>

      <section className="wa-sec">
        <h2>Subscription</h2>
        <div className="wa-card">
          {premium ? (
            <>
              <b>Premium{plan ? ` · ${plan.label}` : ""}</b>
              <p className="wa-lead">
                {STATUS[premium.status]}
                {premium.status === "canceled"
                  ? ` ${until}`
                  : premium.status === "trial"
                    ? ` until ${until}`
                    : ` · renews ${until}`}
              </p>
              <p className="wa-lead">
                {premium.source === "play"
                  ? "Bought on Google Play: manage or cancel it in the Play Store app → your profile → Payments & subscriptions."
                  : "Bought in the App Store: manage or cancel it in your iPhone's Settings → your name → Subscriptions."}
              </p>
            </>
          ) : (
            <div className="wa-row">
              <div>
                <b>Free plan</b>
                <p className="wa-lead">
                  Bible, verse of the day and a daily prayer, forever.
                </p>
              </div>
              <Link href="/app/upgrade" className="btn-line">
                See Premium
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="wa-sec">
        <h2>Account</h2>
        <div className="wa-card">
          <AccountActions />
          <p className="fine" style={{ marginTop: 16 }}>
            <Link href="/privacy">Privacy Policy</Link> ·{" "}
            <Link href="/terms">Terms</Link> ·{" "}
            <Link href="/support">Support</Link>
          </p>
        </div>
      </section>
    </>
  );
}
