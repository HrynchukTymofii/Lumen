"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowIcon, CheckIcon, Light } from "@/components/kit";
import { track } from "@/lib/analytics/client";
import type { CheckoutMode } from "@/lib/checkout";
import { ADDON, DEFAULT_FUNNEL_PLAN, FUNNEL_PLANS, addonRenewal, usd, type FunnelPlan, type FunnelPlanId } from "@/lib/funnel-plans";
import { SITE } from "@/lib/site";
import { funnelTopic, paywallTitle } from "@/funnels/plan";
import type { Answers } from "@/funnels/types";
import { versesFor } from "@/funnels/verses";
import { StoreSheet } from "../../_components/store-sheet";

// The funnel's paywall (v3): plans → (on "continue free", once) a cheaper "Before you go" offer → payment →
// the "Personal audio prayers" upsell → (on "no") a cheaper second offer → /success.
// Payment depends on CHECKOUT_MODE (lib/checkout.ts): "store" opens the App Store / Google Play sheet (the upsells
// can't follow a store purchase, so they're skipped); "stripe" is an on-page checkout, a MOCK-UP for now that
// takes no money. When a Stripe account exists, PayStep is where Stripe Checkout goes.

type Stage = "plans" | "offer" | "pay" | "upsell" | "upsell-offer";
export type Sample = { title: string; url: string };

const INCLUDED = [
  "A personal prayer every day, written for your situation",
  "A companion that remembers your life and checks back in",
  "Your 28-day prayer journey, built from your answers",
  "A journal of what you prayed for and what God answered",
  "Prayers for someone you love, to pray or send",
  "Companion chat by text or voice, 200 messages a week",
  "Guided prayers read aloud and the full Bible",
];

const dateIn = (days: number) => new Date(Date.now() + days * 864e5).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const noop = () => () => {};

export function PaywallFlow({
  answers,
  email,
  mode,
  sample,
}: {
  answers: Answers;
  email?: string;
  mode: CheckoutMode;
  sample: Sample | null;
}) {
  const [stage, setStage] = useState<Stage>("plans");
  const [planId, setPlanId] = useState<FunnelPlanId>(DEFAULT_FUNNEL_PLAN);
  const [offer, setOffer] = useState(false); // the "Before you go" price was taken
  const [offerSeen, setOfferSeen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const plan = FUNNEL_PLANS.find((p) => p.id === planId)!;
  const router = useRouter();

  useEffect(() => track("paywall_viewed", { variant: "v3", placement: "funnel" }), []);
  useEffect(() => {
    window.scrollTo({ top: 0 }); // (scrollTo returns a promise in newer browsers: never return it from an effect)
  }, [stage]);

  // Android visitors go to Google Play when it has a link, everyone else to the App Store
  const android = useSyncExternalStore(
    noop,
    () => /android/i.test(navigator.userAgent),
    () => false,
  );
  const store =
    android && SITE.stores.googlePlay
      ? { id: "play_store", href: SITE.stores.googlePlay, name: "Google Play" }
      : { id: "app_store", href: SITE.stores.appStore, name: "App Store" };

  const free = () => {
    track("funnel_free_chosen", { after_offer: offerSeen });
    router.push("/success?plan=free");
  };
  const finish = (addon: boolean) => {
    router.push(`/success?plan=${plan.id}${addon ? "&addon=1" : ""}&demo=1`);
  };
  const checkout = (withOffer: boolean) => {
    setOffer(withOffer);
    track("funnel_checkout_started", { plan: plan.id, offer: withOffer, mode });
    if (mode === "stripe") setStage("pay");
    else setSheet(true);
  };

  const storeSheet = sheet && (
    <StoreSheet
      plan={{
        // "Start the 4-week plan in the app"
        label: plan.id === "trial" ? "the 7-day trial" : `the ${plan.label.replace(" weeks", "-week")} plan`,
        today: usd(offer ? plan.offer : plan.now),
        price: usd(plan.then),
        period: plan.every.replace("every ", ""),
        intro: true,
        terms: `${usd(offer ? plan.offer : plan.now)} today, then ${usd(plan.then)} ${plan.every}. Paid through the ${store.name}, cancel anytime.`,
      }}
      email={email}
      store={store}
      placement="funnel_paywall"
      onClose={() => setSheet(false)}
    />
  );

  if (stage === "offer")
    return (
      <Calm title="Before you go">
        <p className="sub">
          Start your {plan.label.toLowerCase()} for {usd(plan.offer)} instead of {usd(plan.now)}. Same plan, then {usd(plan.then)} {plan.every}.
          Cancel anytime.
        </p>
        <div className="fn-sticky">
          <Cta onClick={() => checkout(true)}>Start for {usd(plan.offer)}</Cta>
          <button type="button" className="pw-free" onClick={free}>
            No thanks, continue free
          </button>
        </div>
        {storeSheet}
      </Calm>
    );

  if (stage === "pay") return <PayStep plan={plan} offer={offer} onBack={() => setStage("plans")} onPaid={() => setStage("upsell")} />;

  if (stage === "upsell" || stage === "upsell-offer") {
    const second = stage === "upsell-offer";
    return (
      <Upsell
        key={stage}
        second={second}
        plan={plan}
        answers={answers}
        sample={sample}
        onAnswer={(bought) => {
          track("funnel_upsell_answered", { offer: second, bought });
          if (bought || second) finish(bought);
          else setStage("upsell-offer");
        }}
      />
    );
  }

  return (
    <div className="pw fv">
      <h2>{paywallTitle(answers)}</h2>
      <p className="sub">Daily prayer, a companion that remembers, and a journal of answered prayers.</p>

      <div className="pw-plans" role="radiogroup" aria-label="Plan">
        {FUNNEL_PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={planId === p.id}
            className={`pw-plan ${planId === p.id ? "on" : ""}`}
            onClick={() => {
              setPlanId(p.id);
              track("plan_selected", { product_id: p.id });
            }}
          >
            <i className="radio" aria-hidden />
            <span className="what">
              <b>{p.label}</b>
              <small>
                Then {usd(p.then)} {p.every}
              </small>
            </span>
            <span className="amt">
              {usd(p.now)}
              <small>{p.unit}</small>
            </span>
            {p.flag && <span className="badge">{p.flag}</span>}
          </button>
        ))}
      </div>

      <ul className="fv-time">
        <li>
          <span>Today</span>
          <b>{usd(plan.now)}</b>
        </li>
        <li>
          <span>{dateIn(Math.max(1, plan.days - 2))} · before you&apos;re charged</span>
          <b>Email reminder</b>
        </li>
        <li>
          <span>From {dateIn(plan.days)}</span>
          <b>
            {usd(plan.then)} {plan.every}
          </b>
        </li>
      </ul>
      <p className="fine">
        Renews automatically at {usd(plan.then)} {plan.every} unless you cancel.{" "}
        {mode === "store" ? `Cancel anytime in your ${store.name} settings.` : "Cancel anytime in Settings."}
      </p>
      {mode === "stripe" && <div className="fv-guarantee">30-day money-back guarantee. Not right for you? We refund you, no questions.</div>}

      <Cta onClick={() => checkout(false)}>Start my plan</Cta>

      <div className="fv-incl">
        <b>What&apos;s in your plan</b>
        <ul>
          {INCLUDED.map((r) => (
            <li key={r}>
              <CheckIcon size={14} />
              {r}
            </li>
          ))}
        </ul>
        <p className="fine">Free, forever: the Bible, the verse of the day, one daily prayer and 10 companion messages a week.</p>
      </div>

      <button
        type="button"
        className="pw-free"
        onClick={() => {
          if (offerSeen) return free();
          setOfferSeen(true);
          track("funnel_offer_viewed", { plan: plan.id });
          setStage("offer");
        }}
      >
        Continue with the free plan
      </button>
      {storeSheet}
    </div>
  );
}

function Cta({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" className="btn-ink full pw-cta" onClick={onClick} disabled={disabled}>
      {children}
      <span className="dot">
        <ArrowIcon />
      </span>
    </button>
  );
}

function Calm({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fn-q fv-calm">
      <Light size={72} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}

const METHODS = ["Apple Pay", "Google Pay", "Card"] as const;

// Stripe mode. MOCK-UP: no card fields, nothing is charged or sent; the real Stripe Checkout replaces this.
function PayStep({ plan, offer, onBack, onPaid }: { plan: FunnelPlan; offer: boolean; onBack: () => void; onPaid: () => void }) {
  const [method, setMethod] = useState<(typeof METHODS)[number] | null>(null);
  const now = offer ? plan.offer : plan.now;
  return (
    <div className="fn-q fv">
      <h2>Confirm your plan</h2>
      <p className="fine">Secure checkout by Stripe · Demo, you won&apos;t be charged</p>
      <ul className="fv-time">
        <li>
          <span>{plan.label}, today</span>
          <b>{usd(now)}</b>
        </li>
        <li>
          <span>Then, from {dateIn(plan.days)}</span>
          <b>
            {usd(plan.then)} {plan.every}
          </b>
        </li>
      </ul>
      <div className="fn-options">
        {METHODS.map((m, i) => (
          <button key={m} type="button" className={`fn-opt ${method === m ? "on" : ""}`} style={{ animationDelay: `${i * 40}ms` }} onClick={() => setMethod(m)}>
            <span>{m}</span>
          </button>
        ))}
      </div>
      <div className="fv-guarantee">30-day money-back guarantee. Cancel anytime.</div>
      <div className="fn-sticky">
        <Cta
          disabled={!method}
          onClick={() => {
            track("funnel_payment_done", { plan: plan.id, offer, demo: true });
            onPaid();
          }}
        >
          Pay {usd(now)}
        </Cta>
        <button type="button" className="pw-free" onClick={onBack}>
          Change plan
        </button>
      </div>
    </div>
  );
}

function Upsell({
  second,
  plan,
  answers,
  sample,
  onAnswer,
}: {
  second: boolean;
  plan: FunnelPlan;
  answers: Answers;
  sample: Sample | null;
  onAnswer: (bought: boolean) => void;
}) {
  useEffect(() => track("funnel_upsell_viewed", { offer: second }), [second]);
  const price = second ? ADDON.offerNow : ADDON.now;
  const verse = versesFor([funnelTopic(answers)])[0];

  if (second)
    return (
      <Calm title="Before you skip it">
        <p className="sub">
          Get personal audio prayers for {usd(ADDON.offerNow)} today instead of {usd(ADDON.now)}. Then {addonRenewal(plan, true)}, billed and
          canceled together with your plan. The lock-screen promise is still included.
        </p>
        <div className="fn-sticky">
          <Cta onClick={() => onAnswer(true)}>Add for {usd(price)}</Cta>
          <button type="button" className="pw-free" onClick={() => onAnswer(false)}>
            No, thanks
          </button>
        </div>
      </Calm>
    );

  return (
    <div className="fn-q fv">
      <h2>{answers.firstName ? `${answers.firstName}, want to hear a prayer like this every morning?` : "Want to hear a prayer like this every morning?"}</h2>
      <p className="sub">A personal audio prayer every day: your name, your situation, a calm voice.</p>
      {sample && <SamplePlayer sample={sample} />}
      <div className="pw-plan fv-addon">
        <span className="what">
          <b>Personal audio prayers</b>
          <small>
            A new prayer read aloud for you every day, and a voiced prayer for someone you love, sent as a link. Then {addonRenewal(plan, false)},
            billed and canceled together with your plan.
          </small>
        </span>
        <span className="amt">
          {usd(ADDON.now)}
          <small>today</small>
        </span>
      </div>
      <div className="fv-gift">
        <div className="fv-lock" aria-hidden>
          <span className="t">7:00</span>
          <span className="v">“{verse.text}”</span>
          <span className="r">{verse.ref}</span>
        </div>
        <p>
          <b>Free with it</b>
          <br />A personal promise from Scripture for your lock screen, chosen for what you&apos;re carrying.
        </p>
      </div>
      <div className="fn-sticky">
        <Cta onClick={() => onAnswer(true)}>Add for {usd(price)}</Cta>
        <button type="button" className="pw-free" onClick={() => onAnswer(false)}>
          No, thanks
        </button>
      </div>
    </div>
  );
}

const SAMPLE_SECONDS = 15;

// A 15-second taste of the funnel's prayer recording
function SamplePlayer({ sample }: { sample: Sample }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  return (
    <div className="fv-sample">
      <audio
        ref={audio}
        src={sample.url}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setTime(a.currentTime);
          if (a.currentTime >= SAMPLE_SECONDS) {
            a.pause();
            a.currentTime = 0;
          }
        }}
      />
      <button
        type="button"
        className="play"
        aria-label={playing ? "Pause" : `Play ${sample.title}`}
        onClick={() => (audio.current?.paused ? audio.current.play().catch(() => {}) : audio.current?.pause())}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <span>
        <b>Hear how it sounds</b>
        <small>A 15-second sample from our library. Yours will use your name.</small>
        <i className="bar">
          <i style={{ width: `${Math.min(100, (time / SAMPLE_SECONDS) * 100)}%` }} />
        </i>
      </span>
    </div>
  );
}
