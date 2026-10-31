"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowIcon, BookIcon, CheckIcon, Light, Scene } from "@/components/kit";
import { identify, track } from "@/lib/analytics/client";
import { SITE } from "@/lib/site";
import { funnels } from "@/funnels";
import { buildPlan } from "@/funnels/plan";
import type { Answers, Option, Step } from "@/funnels/types";
import type { Citation } from "@/funnels/verses";
import { Paywall } from "../../_components/paywall";
import { PostError, post } from "../../_components/post";

// The quiz funnel state machine (SPEC §8.2): one question per screen, answers kept in sessionStorage
// so a refresh resumes, analytics on every step. Faith answers never go to analytics, only "hidden".

type Saved = { index: number; answers: Answers; startedAt?: number; signedUp?: boolean };
type Prayer = { title: string; text: string; citations: Citation[]; source?: string };

const UTM_KEYS = ["source", "medium", "campaign", "content", "term"] as const;

function load<T>(key: string, store: "session" | "local" = "session"): T | null {
  try {
    const raw = (store === "session" ? sessionStorage : localStorage).getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown, store: "session" | "local" = "session") {
  try {
    (store === "session" ? sessionStorage : localStorage).setItem(key, JSON.stringify(value));
  } catch {}
}

function paywallVariant(): "A" | "B" {
  const saved = load<"A" | "B">("pc_paywall_variant", "local");
  if (saved === "A" || saved === "B") return saved;
  const v = Math.random() < 0.5 ? "A" : "B";
  save("pc_paywall_variant", v, "local");
  return v;
}

// Resume where the visitor left off. Coming back from Stripe's "back" (?step=paywall) jumps to the paywall,
// but only for someone who already got that far.
function restore(key: string, steps: Step[]): Saved {
  const saved = load<Saved>(key) ?? { index: 0, answers: {} };
  const jump = new URLSearchParams(window.location.search).get("step");
  const jumpIndex = jump ? steps.findIndex((s) => s.id === jump) : -1;
  return jumpIndex >= 0 && saved.signedUp ? { ...saved, index: jumpIndex } : saved;
}

const vibrate = () => {
  try {
    navigator.vibrate?.(8);
  } catch {}
};

export function Funnel({ slug }: { slug: string }) {
  const config = funnels[slug];
  const key = `pc_funnel_${slug}`;
  // Client-only component (see funnel-loader.tsx), so sessionStorage can be read while initialising
  const [state, setState] = useState<Saved>(() => restore(key, config.steps));
  const [dir, setDir] = useState<1 | -1>(1);

  useEffect(() => {
    // First touch wins: keep the first visit that actually carried UTMs
    const params = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(UTM_KEYS.flatMap((k) => (params.get(`utm_${k}`) ? [[k, params.get(`utm_${k}`)]] : [])));
    if (Object.keys(utm).length && !load("pc_utm")) save("pc_utm", utm);
    track("funnel_viewed", { funnel_slug: slug });
  }, [slug]);

  useEffect(() => save(key, state), [key, state]);

  const step = config.steps[state.index];
  const questionSteps = config.steps.filter((s) => !["landing", "paywall"].includes(s.type));
  const progress = Math.max(0, questionSteps.indexOf(step)) / questionSteps.length;

  function go(delta: 1 | -1, patch?: Partial<Answers>) {
    setDir(delta);
    setState((s) => {
      const answers = { ...s.answers, ...patch };
      let index = Math.min(Math.max(s.index + delta, 0), config.steps.length - 1);
      // Never walk back into the loading screen or past the email once signed up
      while (delta < 0 && index > 0 && config.steps[index].type === "loading") index--;
      return { ...s, index, answers, startedAt: s.startedAt ?? Date.now() };
    });
    window.scrollTo({ top: 0 });
  }

  function answer(s: Step, value: string | string[] | number, patch: Partial<Answers>) {
    const hidden = "sensitive" in s && s.sensitive;
    track("quiz_step_completed", { funnel_slug: slug, step_id: s.id, answer: hidden ? "hidden" : typeof value === "number" ? String(value) : value });
    vibrate();
    go(1, patch);
  }

  const canGoBack = state.index > 0 && step.type !== "paywall" && !(step.type === "email" && state.signedUp);

  return (
    <div className="fn-shell">
      {step.type !== "landing" && (
        <div className="fn-top">
          <button type="button" className="fn-back" onClick={() => go(-1)} disabled={!canGoBack} aria-label="Back">
            <ArrowIcon size={18} />
          </button>
          <div className="fn-progress" aria-hidden>
            <i style={{ width: `${Math.round((step.type === "paywall" ? 1 : progress) * 100)}%` }} />
          </div>
        </div>
      )}

      <div key={state.index} className={`fn-step ${dir > 0 ? "in-right" : "in-left"}`}>
        <StepView
          step={step}
          slug={slug}
          answers={state.answers}
          onStart={() => {
            track("quiz_started", { funnel_slug: slug });
            go(1);
          }}
          onAnswer={answer}
          onNext={(patch) => go(1, patch)}
          onLoaded={(patch) => {
            track("quiz_completed", { funnel_slug: slug, duration_ms: Date.now() - (state.startedAt ?? Date.now()) });
            go(1, patch);
          }}
          onSignedUp={() => {
            setState((s) => ({ ...s, signedUp: true }));
            go(1);
          }}
        />
      </div>
    </div>
  );
}

type StepProps = {
  step: Step;
  slug: string;
  answers: Answers;
  onStart: () => void;
  onAnswer: (step: Step, value: string | string[] | number, patch: Partial<Answers>) => void;
  onNext: (patch?: Partial<Answers>) => void;
  onLoaded: (patch: Partial<Answers>) => void;
  onSignedUp: () => void;
};

function StepView({ step, slug, answers, onStart, onAnswer, onNext, onLoaded, onSignedUp }: StepProps) {
  switch (step.type) {
    case "landing":
      return (
        <div className="fn-landing">
          <Scene name={step.scene} />
          <div className="fn-card">
            <Light size={72} />
            <h1>{step.title}</h1>
            <p className="sub">{step.subtitle}</p>
            <button type="button" className="btn-ink full" onClick={onStart}>
              {step.cta}
              <span className="dot">
                <ArrowIcon />
              </span>
            </button>
            <p className="fine center">2 minutes · The Bible, daily verse and a daily prayer are free forever.</p>
          </div>
        </div>
      );

    case "single":
      return (
        <Question title={step.title} subtitle={step.subtitle}>
          <div className="fn-options">
            {step.options.map((o, i) => (
              <OptionButton
                key={o.value}
                option={o}
                index={i}
                selected={answers[step.answerKey] === o.value}
                onClick={() => onAnswer(step, o.value, { [step.answerKey]: o.value })}
              />
            ))}
          </div>
        </Question>
      );

    case "multi":
      return <MultiStep step={step} value={(answers[step.answerKey] as string[] | undefined) ?? []} onDone={(v) => onAnswer(step, v, { [step.answerKey]: v })} />;

    case "scale":
      return (
        <Question title={step.title} subtitle={step.statement}>
          <div className="fn-scale">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={answers.burden === n ? "on" : ""}
                onClick={() => onAnswer(step, n, { burden: n })}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="fn-scale-labels">
            <span>{step.low}</span>
            <span>{step.high}</span>
          </div>
        </Question>
      );

    case "text":
      return <TextStep step={step} value={answers.firstName ?? ""} onDone={(v) => onAnswer(step, v ? "given" : "skipped", { firstName: v || undefined })} />;

    case "fact":
      return (
        <div className="fn-fact">
          <Scene name={step.scene} />
          <div className="fn-card">
            <h2>{step.title}</h2>
            {step.stat && <div className="stat">{step.stat}</div>}
            <p>{step.body}</p>
            <p className="fine">Source: {step.source}</p>
            <ContinueButton onClick={() => onNext()} />
          </div>
        </div>
      );

    case "loading":
      return <LoadingStep step={step} answers={answers} onDone={onLoaded} />;

    case "plan":
      return <PlanStep slug={slug} answers={answers} onNext={() => onNext()} />;

    case "email":
      return <EmailStep slug={slug} answers={answers} onDone={onSignedUp} />;

    case "paywall":
      return (
        <Paywall
          variant={paywallVariant()}
          name={answers.firstName}
          placement="funnel"
          funnelSlug={slug}
          onFree={() => (window.location.href = "/success?plan=free")}
        />
      );
  }
}

function Question({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="fn-q">
      <h2>{title}</h2>
      {subtitle && <p className="sub">{subtitle}</p>}
      {children}
    </div>
  );
}

function OptionButton({ option, index, selected, onClick, multi }: { option: Option; index: number; selected: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button
      type="button"
      className={`fn-opt ${selected ? "on" : ""}`}
      style={{ animationDelay: `${index * 40}ms` }}
      aria-pressed={multi ? selected : undefined}
      onClick={onClick}
    >
      <span>
        {option.label}
        {option.hint && <small>{option.hint}</small>}
      </span>
      {multi && <i className="box">{selected && <CheckIcon size={13} />}</i>}
    </button>
  );
}

function ContinueButton({ onClick, disabled, label = "Continue" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <div className="fn-sticky">
      <button type="button" className="btn-ink full" onClick={onClick} disabled={disabled}>
        {label}
        <span className="dot">
          <ArrowIcon />
        </span>
      </button>
    </div>
  );
}

function MultiStep({ step, value, onDone }: { step: Extract<Step, { type: "multi" }>; value: string[]; onDone: (v: string[]) => void }) {
  const [picked, setPicked] = useState(value);
  const max = step.maxSelect ?? step.options.length;
  const toggle = (v: string) =>
    setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : p.length >= max ? [...p.slice(1), v] : [...p, v]));
  return (
    <Question title={step.title} subtitle={step.subtitle}>
      <div className="fn-options">
        {step.options.map((o, i) => (
          <OptionButton key={o.value} option={o} index={i} multi selected={picked.includes(o.value)} onClick={() => toggle(o.value)} />
        ))}
      </div>
      <ContinueButton onClick={() => onDone(picked)} disabled={!picked.length} />
    </Question>
  );
}

function TextStep({ step, value, onDone }: { step: Extract<Step, { type: "text" }>; value: string; onDone: (v: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <Question title={step.title} subtitle={step.subtitle}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onDone(text.trim());
        }}
      >
        <input
          className="fn-input"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 40))}
          placeholder={step.placeholder}
          autoComplete="given-name"
          autoFocus
        />
        <div className="fn-sticky">
          <button type="submit" className="btn-ink full">
            {text.trim() ? "Continue" : "Skip"}
            <span className="dot">
              <ArrowIcon />
            </span>
          </button>
        </div>
      </form>
    </Question>
  );
}

function LoadingStep({ step, answers, onDone }: { step: Extract<Step, { type: "loading" }>; answers: Answers; onDone: (p: Partial<Answers>) => void }) {
  const [pct, setPct] = useState(0);
  const [micro, setMicro] = useState<string | undefined>(step.micro ? (answers[step.micro.answerKey] as string | undefined) : undefined);
  const asking = Boolean(step.micro) && !micro && pct >= 45;
  const done = useRef(false);

  useEffect(() => {
    if (asking) return; // pause while the micro-question is open
    if (pct >= 100) {
      if (!done.current) {
        done.current = true;
        setTimeout(() => onDone(step.micro && micro ? { [step.micro.answerKey]: micro } : {}), 350);
      }
      return;
    }
    const t = setTimeout(() => setPct((p) => Math.min(100, p + 2)), 70);
    return () => clearTimeout(t);
  }, [pct, asking, micro, onDone, step.micro]);

  const shown = Math.floor((pct / 100) * step.messages.length);
  return (
    <div className="fn-loading">
      <div className="ring" style={{ "--p": pct } as React.CSSProperties}>
        <Light size={88} state="thinking" />
      </div>
      <div className="pct">{pct}%</div>
      <ul>
        {step.messages.map((m, i) => (
          <li key={m} className={i < shown ? "done" : i === shown ? "now" : ""}>
            <i>{i < shown && <CheckIcon size={12} />}</i>
            {m}
          </li>
        ))}
      </ul>
      {asking && step.micro && (
        <div className="fn-sheet" role="dialog" aria-label={step.micro.title}>
          <b>{step.micro.title}</b>
          <div className="row">
            {step.micro.options.map((o) => (
              <button key={o.value} type="button" className="btn-line" onClick={() => setMicro(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanStep({ slug, answers, onNext }: { slug: string; answers: Answers; onNext: () => void }) {
  const plan = useMemo(() => buildPlan(answers), [answers]);
  const [prayer, setPrayer] = useState<Prayer | null>(() => load<Prayer>(`pc_prayer_${slug}`));
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    track("plan_viewed", { funnel_slug: slug });
    if (prayer) return;
    const started = performance.now();
    post<Prayer>("/api/funnel/sample-prayer", { answers })
      .then((p) => {
        setPrayer(p);
        save(`pc_prayer_${slug}`, p);
        track("sample_prayer_generated", { latency_ms: Math.round(performance.now() - started) });
      })
      .catch(() => setPrayer({ title: "Your prayer", text: "We couldn't write your prayer just now. It will be waiting in your account.", citations: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per visit
  }, []);

  return (
    <div className="fn-plan">
      <h2>{answers.firstName ? `${answers.firstName}, here's your first prayer` : "Here's your first prayer"}</h2>
      <div className="fn-prayer">
        <div className="who">
          <Light size={40} state={prayer ? "idle" : "speaking"} />
          <span>
            {prayer?.title ?? "Writing your prayer…"}
            <small>Written for what you&apos;re carrying</small>
          </span>
        </div>
        {prayer ? (
          <>
            <div className="text">
              {prayer.text.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="chips">
              {prayer.citations.map((c) => (
                <button key={c.ref} type="button" className="vchip" aria-expanded={open === c.ref} onClick={() => setOpen(open === c.ref ? null : c.ref)}>
                  <BookIcon />
                  {c.ref}
                </button>
              ))}
            </div>
            {prayer.citations.map(
              (c) =>
                open === c.ref && (
                  <p key={c.ref} className="verse-pop">
                    {c.text}
                    <small>{c.ref} · World English Bible</small>
                  </p>
                ),
            )}
          </>
        ) : (
          <div className="skeleton" aria-hidden>
            <i />
            <i />
            <i />
          </div>
        )}
      </div>

      <h3>Your 7-day prayer path</h3>
      <ol className="fn-days">
        {plan.map((d) => (
          <li key={d.day}>
            <span className="n">{d.day}</span>
            <span>
              <b>{d.title}</b>
              <small>{d.focus}</small>
            </span>
          </li>
        ))}
      </ol>
      <ContinueButton onClick={onNext} label="Save my path" />
    </div>
  );
}

function EmailStep({ slug, answers, onDone }: { slug: string; answers: Answers; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await post<{ user: { id: string } }>("/api/funnel/email", {
        email,
        funnelSlug: slug,
        answers,
        sensitiveConsent: consent,
        marketingOptIn: marketing,
        paywallVariant: paywallVariant(),
        utm: load("pc_utm") ?? {},
      });
      identify(user.id, { funnel_slug: slug, paywall_variant: paywallVariant() });
      track("email_submitted", { funnel_slug: slug });
      onDone();
    } catch (err) {
      if (err instanceof PostError && err.code === "exists") setExists(true);
      else setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (exists) {
    return (
      <Question title="Welcome back" subtitle={`You already have a ${SITE.name} account with ${email}.`}>
        <p className="fn-note">We just emailed you a sign-in link. Open it on this device to see your prayer path and plan.</p>
        <Link href="/app/login" className="btn-line full">
          Sign in with a code instead
        </Link>
      </Question>
    );
  }

  return (
    <Question title="Where should we send your prayer path?" subtitle="Your account keeps your path, your prayers and your answers. No password needed.">
      <form onSubmit={submit} className="fn-email">
        <input
          className="fn-input"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="fn-check">
          <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            I agree that {SITE.name} stores my answers, including about my faith and what I&apos;m going through, to personalise my
            prayers. See the{" "}
            <Link href="/privacy" target="_blank">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <label className="fn-check">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
          <span>Send me occasional prayers and news by email (optional).</span>
        </label>
        {error && <p className="fn-error">{error}</p>}
        <div className="fn-sticky">
          <button type="submit" className="btn-ink full" disabled={busy || !consent}>
            {busy ? "Saving…" : "Continue"}
            <span className="dot">
              <ArrowIcon />
            </span>
          </button>
          <p className="fine center">
            By continuing you accept the <Link href="/terms">Terms</Link>.
          </p>
        </div>
      </form>
    </Question>
  );
}
