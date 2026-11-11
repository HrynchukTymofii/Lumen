"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowIcon, BookIcon, CheckIcon, Light, Scene } from "@/components/kit";
import { identify, track } from "@/lib/analytics/client";
import type { CheckoutMode } from "@/lib/checkout";
import { SITE } from "@/lib/site";
import { funnels } from "@/funnels";
import { JOURNEY_WEEKS, journeyBasis, loaderLines, topicOf } from "@/funnels/plan";
import type { AdTheme, Answers, Option, Step } from "@/funnels/types";
import type { Citation } from "@/funnels/verses";
import { clock, phrases, type Line } from "@/lib/phrases";
import { PostError, post } from "../../_components/post";
import { SocialSignIn } from "../../app/login/social-sign-in";
import { MusicButton, useFunnelMusic } from "./music";
import { PaywallFlow, type Sample } from "./paywall-flow";

// The quiz funnel state machine (SPEC §8.2): one question per screen, answers kept in sessionStorage
// so a refresh resumes, analytics on every step. Faith answers never go to analytics, only "hidden".

// theme: the ad this visit came from (?utm_content=b8), see the landing step's `themes`
type Saved = { index: number; answers: Answers; startedAt?: number; signedUp?: boolean; email?: string; theme?: string };
type Prayer = { title: string; text: string; citations: Citation[]; source?: string };
/** Client ids for Sign in with Google / Apple (lib/auth/web-sign-in.ts); null hides that button */
type SignInConfig = { google: string | null; apple: string | null };

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

// Resume where the visitor left off. A link with ?step=paywall jumps to the paywall, but only for someone who
// already got that far.
function restore(key: string, steps: Step[]): Saved {
  const saved = load<Saved>(key) ?? { index: 0, answers: {} };
  const theme = saved.theme ?? adTheme(steps);
  const jump = new URLSearchParams(window.location.search).get("step");
  const jumpIndex = jump ? steps.findIndex((s) => s.id === jump) : -1;
  return jumpIndex >= 0 && saved.signedUp ? { ...saved, theme, index: jumpIndex } : { ...saved, theme };
}

// The ad the visitor came from: ?utm_content=b8, ?pain=b8 or just ?b8 (codes are the landing step's `themes`)
function adTheme(steps: Step[]): string | undefined {
  const landing = steps.find((s) => s.type === "landing");
  const themes = landing?.type === "landing" ? landing.themes : undefined;
  if (!themes) return undefined;
  for (const [k, v] of new URLSearchParams(window.location.search)) {
    const key = k.toLowerCase();
    const value = v.toLowerCase();
    if ((key === "utm_content" || key === "pain") && themes[value]) return value;
    if (themes[key]) return key;
  }
  return undefined;
}

// Answers an ad already implies, filled in when the quiz starts (never over an answer already given)
function prefill(theme: AdTheme | undefined, answers: Answers): Answers {
  const out: Record<string, unknown> = { ...answers };
  for (const [key, value] of Object.entries(theme?.prefill ?? {})) {
    const current = out[key];
    if (current === undefined || (Array.isArray(current) && !current.length)) out[key] = value;
  }
  return out as Answers;
}

const vibrate = () => {
  try {
    navigator.vibrate?.(8);
  } catch {}
};

export function Funnel({ slug, signIn, mode }: { slug: string; signIn: SignInConfig; mode: CheckoutMode }) {
  const config = funnels[slug];
  const key = `pc_funnel_${slug}`;
  // Client-only component (see funnel-loader.tsx), so sessionStorage can be read while initialising
  const [state, setState] = useState<Saved>(() => restore(key, config.steps));
  const [dir, setDir] = useState<1 | -1>(1);
  const music = useFunnelMusic();

  useEffect(() => {
    // First touch wins: keep the first visit that actually carried UTMs
    const params = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(UTM_KEYS.flatMap((k) => (params.get(`utm_${k}`) ? [[k, params.get(`utm_${k}`)]] : [])));
    if (Object.keys(utm).length && !load("pc_utm")) save("pc_utm", utm);
    track("funnel_viewed", { funnel_slug: slug });
  }, [slug]);

  useEffect(() => save(key, state), [key, state]);

  const step = config.steps[state.index];
  const questionSteps = config.steps.filter((s) => !["landing", "paywall"].includes(s.type) && !s.skip?.(state.answers));
  const progress = Math.max(0, questionSteps.indexOf(step)) / questionSteps.length;
  // The warm glow rising from the bottom: none on the landing, full by the first prayer
  const prayerAt = Math.max(1, questionSteps.findIndex((s) => s.type === "prayer"));
  const glow = step.type === "landing" ? 0 : step.type === "paywall" ? 1 : Math.max(0.08, Math.min(1, questionSteps.indexOf(step) / prayerAt));

  function go(delta: 1 | -1, patch?: Partial<Answers>) {
    setDir(delta);
    setState((s) => {
      const answers = { ...s.answers, ...patch };
      const last = config.steps.length - 1;
      let index = Math.min(Math.max(s.index + delta, 0), last);
      // Pass over steps that don't apply to these answers, and never walk back into the loading screen
      const passOver = (i: number) => Boolean(config.steps[i].skip?.(answers)) || (delta < 0 && config.steps[i].type === "loading");
      while (index > 0 && index < last && passOver(index)) index += delta;
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

  // Once the email is in, the quiz is saved: no walking back into it from the prayer
  const canGoBack = state.index > 0 && step.type !== "paywall" && !((step.type === "email" || step.type === "prayer") && state.signedUp);

  const landing = config.steps[0];
  const theme = landing.type === "landing" && state.theme ? landing.themes?.[state.theme] : undefined;

  return (
    // After a refresh mid-quiz, the music starts again with the next tap
    <div className="fn-shell" style={{ "--g": glow } as React.CSSProperties} onPointerDown={state.index > 0 ? music.start : undefined}>
      {step.type !== "landing" && (
        <div className="fn-top">
          <button type="button" className="fn-back" onClick={() => go(-1)} disabled={!canGoBack} aria-label="Back">
            <ArrowIcon size={18} />
          </button>
          <div className="fn-progress" aria-hidden>
            <i style={{ width: `${Math.round((step.type === "paywall" ? 1 : progress) * 100)}%` }} />
          </div>
          {music.ready && <MusicButton on={music.on} onClick={music.toggle} />}
        </div>
      )}

      <div key={state.index} className={`fn-step ${dir > 0 ? "in-right" : "in-left"}`}>
        <StepView
          step={step}
          slug={slug}
          signIn={signIn}
          mode={mode}
          theme={theme}
          answers={state.answers}
          onStart={() => {
            track("quiz_started", { funnel_slug: slug, ...(theme && { ad_theme: theme.code }) });
            music.start();
            go(1, prefill(theme, state.answers));
          }}
          onAnswer={answer}
          onNext={(patch) => go(1, patch)}
          onLoaded={(patch) => {
            track("quiz_completed", { funnel_slug: slug, duration_ms: Date.now() - (state.startedAt ?? Date.now()) });
            go(1, patch);
          }}
          email={state.email}
          onSignedUp={(email) => {
            setState((s) => ({ ...s, signedUp: true, email }));
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
  signIn: SignInConfig;
  mode: CheckoutMode;
  theme?: AdTheme;
  answers: Answers;
  onStart: () => void;
  onAnswer: (step: Step, value: string | string[] | number, patch: Partial<Answers>) => void;
  onNext: (patch?: Partial<Answers>) => void;
  onLoaded: (patch: Partial<Answers>) => void;
  email?: string;
  onSignedUp: (email: string) => void;
};

function StepView({ step, slug, signIn, mode, theme, answers, email, onStart, onAnswer, onNext, onLoaded, onSignedUp }: StepProps) {
  switch (step.type) {
    case "landing":
      return (
        <div className="fn-landing">
          <Scene name={step.scene} />
          <div className="fn-card">
            <Light size={72} />
            <h1>{theme?.title ?? step.title}</h1>
            <p className="sub">{step.subtitle}</p>
            <button type="button" className="btn-ink full" onClick={onStart}>
              {theme?.cta ?? step.cta}
              <span className="dot">
                <ArrowIcon />
              </span>
            </button>
            <p className="fine center">About 3 minutes · The Bible, daily verse and a daily prayer are free forever.</p>
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
      return <MultiStep step={step} answers={answers} onDone={(v) => onAnswer(step, v, { [step.answerKey]: v })} />;

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
      return (
        <TextStep
          step={step}
          value={answers[step.answerKey] ?? ""}
          onDone={(v) => onAnswer(step, v ? "given" : "skipped", { [step.answerKey]: v || undefined })}
        />
      );

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

    case "insight": {
      const earlier = step.follows ? answers[step.follows.answerKey] : undefined;
      const words = step.follows && earlier !== undefined ? step.follows.variants[String(earlier)] : undefined;
      const base = words?.title ?? step.title;
      const title = step.named && answers.firstName ? `${answers.firstName}, ${base[0].toLowerCase()}${base.slice(1)}` : base;
      return <InsightCard scene={step.scene} title={title} body={words?.body ?? step.body} verse={words?.verse ?? step.verse} onNext={() => onNext()} />;
    }

    case "obstacle-insight": {
      // The prototype's rule: "I don't know what to say" wins when picked, else the first obstacle picked
      const picked = (answers.obstacles ?? []).filter((o) => step.insights[o]);
      const [title, body] = step.insights[picked.includes(step.prefer) ? step.prefer : (picked[0] ?? step.prefer)];
      return <InsightCard scene={step.scene} title={title} body={body} onNext={() => onNext()} />;
    }

    case "loading":
      return <LoadingStep step={step} answers={answers} onDone={onLoaded} />;

    case "prayer":
      return <PrayerStep slug={slug} answers={answers} onNext={() => onNext()} />;

    case "path":
      return <PathStep slug={slug} answers={answers} onNext={() => onNext()} />;

    case "email":
      return <EmailStep slug={slug} signIn={signIn} answers={answers} onDone={onSignedUp} />;

    case "paywall":
      return <PaywallStep slug={slug} answers={answers} email={email} mode={mode} />;
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

function InsightCard({ scene, title, body, verse, onNext }: { scene: string; title: string; body: string; verse?: Citation; onNext: () => void }) {
  return (
    <div className="fn-fact fn-insight">
      <Scene name={scene} />
      <div className="fn-card">
        <Light size={56} />
        <h2>{title}</h2>
        <p>{body}</p>
        {verse && (
          <blockquote className="fn-verse">
            {verse.text}
            <cite>{verse.ref}</cite>
          </blockquote>
        )}
        <ContinueButton onClick={onNext} />
      </div>
    </div>
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

function MultiStep({ step, answers, onDone }: { step: Extract<Step, { type: "multi" }>; answers: Answers; onDone: (v: string[]) => void }) {
  const earlier = step.follows ? answers[step.follows.answerKey] : undefined;
  const variant = step.follows && typeof earlier === "string" ? step.follows.variants[earlier] : undefined;
  const title = variant?.title ?? step.title;
  const subtitle = variant ? variant.subtitle : step.subtitle;
  const options = [...step.options, ...(variant?.extra ?? [])];
  const exclusive = new Set(options.filter((o) => o.exclusive).map((o) => o.value));
  // Only what's on screen counts (an earlier pick may belong to options this wording doesn't offer)
  const [picked, setPicked] = useState(() =>
    ((answers[step.answerKey] as string[] | undefined) ?? []).filter((v) => options.some((o) => o.value === v)),
  );
  const max = step.maxSelect ?? options.length;
  const toggle = (v: string) =>
    setPicked((p) => {
      if (p.includes(v)) return p.filter((x) => x !== v);
      if (exclusive.has(v)) return [v];
      const rest = p.filter((x) => !exclusive.has(x));
      return rest.length >= max ? [...rest.slice(1), v] : [...rest, v];
    });
  return (
    <Question title={title} subtitle={subtitle}>
      <div className="fn-options">
        {options.map((o, i) => (
          <OptionButton key={o.value} option={o} index={i} multi selected={picked.includes(o.value)} onClick={() => toggle(o.value)} />
        ))}
      </div>
      <ContinueButton onClick={() => onDone(picked)} disabled={!picked.length} />
    </Question>
  );
}

function TextStep({ step, value, onDone }: { step: Extract<Step, { type: "text" }>; value: string; onDone: (v: string) => void }) {
  const [text, setText] = useState(value);
  const max = step.maxLength ?? 40;
  return (
    <Question title={step.title} subtitle={step.subtitle}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onDone(text.trim());
        }}
      >
        {step.multiline ? (
          <textarea
            className="fn-input fn-textarea"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, max))}
            placeholder={step.placeholder}
            aria-label={step.title}
            rows={5}
          />
        ) : (
          <input
            className="fn-input"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, max))}
            placeholder={step.placeholder}
            autoComplete="given-name"
            autoFocus
          />
        )}
        {step.note && <p className="fine fn-text-note">{step.note}</p>}
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

// The "making your path" screen: one smooth sweep of ~6.5 s that breathes, quick then slow then quick again,
// drawn as a golden halo around the Light. Optional micro-question (step.micro) pauses it at 45%.
const LOAD_MS = 6500;
// Monotone 0→1 curve with a changing speed: a slow start and finish, plus a gentle wave so it surges and lingers
// (derivative of the wave term is 0.55·cos(5πt), so it never runs backwards). Ends exactly at 1.
const loadCurve = (t: number) => {
  const wave = t + (0.55 * Math.sin(5 * Math.PI * t)) / (5 * Math.PI);
  return wave < 0.5 ? 4 * wave ** 3 : 1 - (-2 * wave + 2) ** 3 / 2;
};
const HALO_R = 54;
const HALO_C = 2 * Math.PI * HALO_R;

function LoadingStep({ step, answers, onDone }: { step: Extract<Step, { type: "loading" }>; answers: Answers; onDone: (p: Partial<Answers>) => void }) {
  const [pct, setPct] = useState(0); // 0..100, fractional
  const [micro, setMicro] = useState<string | undefined>(step.micro ? (answers[step.micro.answerKey] as string | undefined) : undefined);
  const asking = Boolean(step.micro) && !micro && pct >= 45;
  const elapsed = useRef(0); // ms of animation so far, kept across a micro-question pause
  const done = useRef(false);

  useEffect(() => {
    if (asking || done.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) elapsed.current = Math.max(elapsed.current, LOAD_MS * 0.6);
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current = Math.min(LOAD_MS, elapsed.current + (now - last));
      last = now;
      const p = loadCurve(elapsed.current / LOAD_MS) * 100;
      setPct(p);
      if (step.micro && !micro && p >= 45) return; // stop here; the sheet opens
      if (elapsed.current < LOAD_MS) raf = requestAnimationFrame(tick);
      else if (!done.current) {
        done.current = true;
        setTimeout(() => onDone(step.micro && micro ? { [step.micro.answerKey]: micro } : {}), 450);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [asking, micro, onDone, step.micro]);

  const messages = step.personal ? loaderLines(answers) : step.messages;
  const shown = Math.floor((pct / 100) * messages.length);
  return (
    <div className="fn-loading">
      <div className="halo-ring">
        <svg viewBox="0 0 120 120" aria-hidden>
          <defs>
            <linearGradient id="halo-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFF1C9" />
              <stop offset=".5" stopColor="#F5C77E" />
              <stop offset="1" stopColor="#F5AE6C" />
            </linearGradient>
            <filter id="halo-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          <circle className="track" cx="60" cy="60" r={HALO_R} />
          <g transform="rotate(-90 60 60)" style={{ strokeDasharray: HALO_C, strokeDashoffset: HALO_C * (1 - pct / 100) }}>
            <circle className="glow" cx="60" cy="60" r={HALO_R} filter="url(#halo-glow)" />
            <circle className="arc" cx="60" cy="60" r={HALO_R} />
          </g>
        </svg>
        <Light size={88} state="thinking" />
      </div>
      <div className="pct">{Math.floor(pct)}%</div>
      <ul>
        {messages.map((m, i) => (
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

// The written prayer (AI, with a template fallback): only used while no recording fits (see firstPrayer)
const prayerRequests = new Map<string, Promise<Prayer>>();
function requestPrayer(slug: string, answers: Answers): Promise<Prayer> {
  const saved = load<Prayer>(`pc_prayer_${slug}`);
  if (saved) return Promise.resolve(saved);
  let request = prayerRequests.get(slug);
  if (!request) {
    const started = performance.now();
    request = post<Prayer>("/api/funnel/sample-prayer", { answers })
      .then((p) => {
        save(`pc_prayer_${slug}`, p);
        track("sample_prayer_generated", { latency_ms: Math.round(performance.now() - started) });
        return p;
      })
      .catch(() => {
        prayerRequests.delete(slug);
        return { title: "Your prayer", text: "We couldn't write your prayer just now. It will be waiting in your account.", citations: [] };
      });
    prayerRequests.set(slug, request);
  }
  return request;
}

// The first prayer is a recording from the admin library (category "funnel", tagged with the struggles it fits;
// one of several is picked at random). Until a recording fits, the written prayer stands in. Asked for on the
// email step, so it's usually ready when the prayer screen opens.
type Recording = { slug: string; title: string; scene: string; imageUrl: string | null; url: string; durationSec: number | null; lines: Line[] };
type FirstPrayer = { recording: Recording } | { prayer: Prayer };
const firstRequests = new Map<string, Promise<FirstPrayer>>();
function firstPrayer(slug: string, answers: Answers): Promise<FirstPrayer> {
  let request = firstRequests.get(slug);
  if (!request) {
    request = fetch(`/api/funnel/recording?s=${encodeURIComponent((answers.struggles ?? []).join(","))}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ recording: Recording | null }>) : { recording: null }))
      .catch(() => ({ recording: null }))
      .then(({ recording }) => (recording ? { recording } : requestPrayer(slug, answers).then((prayer) => ({ prayer }))));
    firstRequests.set(slug, request);
  }
  return request;
}

function PrayerStep({ slug, answers, onNext }: { slug: string; answers: Answers; onNext: () => void }) {
  const [first, setFirst] = useState<FirstPrayer | null>(null);
  useEffect(() => {
    let live = true;
    firstPrayer(slug, answers).then((f) => live && setFirst(f));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per visit
  }, []);

  return (
    <div className="fn-plan">
      <h2>{answers.firstName ? `${answers.firstName}, here is your first prayer` : "Here is your first prayer"}</h2>
      <p className="sub">
        A prayer for {topicOf(answers)}.{first && "recording" in first && " Press play and listen."}
      </p>
      {!first ? (
        <div className="fn-prayer">
          <div className="skeleton" aria-hidden>
            <i />
            <i />
            <i />
          </div>
        </div>
      ) : "recording" in first ? (
        <RecordedPrayer slug={slug} recording={first.recording} />
      ) : (
        <WrittenPrayer prayer={first.prayer} />
      )}
      <ContinueButton onClick={onNext} label="See my 28-day journey" disabled={!first} />
    </div>
  );
}

function WrittenPrayer({ prayer }: { prayer: Prayer }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="fn-prayer">
      <div className="who">
        <Light size={40} />
        <span>
          {prayer.title}
          <small>Written for what you&apos;re carrying</small>
        </span>
      </div>
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
    </div>
  );
}

// The app's guided player on the web (app/app/player/[slug].tsx): the picture and the Light on top, and below it the
// whole prayer as text that follows the audio. The phrase being spoken is bright, the ones around it fade back, the
// text scrolls with it (unless it was just scrolled by hand), and a phrase can be tapped to play from there.
// At the end the text gives way to "Amen."
const SKIP = 15;
const HAND_SCROLL_MS = 5000;

function SkipIcon({ forward }: { forward?: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g transform={forward ? "matrix(-1 0 0 1 24 0)" : undefined}>
        <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
        <path d="M4.5 4.2v3.6h3.6" />
      </g>
      <text x="12" y="15" fontSize="7" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="600">
        15
      </text>
    </svg>
  );
}

function RecordedPrayer({ slug, recording }: { slug: string; recording: Recording }) {
  const audio = useRef<HTMLAudioElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const handAt = useRef(0);
  const started = useRef(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(recording.durationSec ?? 0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);

  const list = useMemo(() => phrases(recording.lines, duration), [recording.lines, duration]);
  // The phrase being spoken: the last one that has started
  let current = 0;
  for (let i = 0; i < list.length; i++) if (list[i].start <= time + 0.2) current = i;

  // Follow the voice, unless the text was just scrolled by hand
  useEffect(() => {
    if (Date.now() - handAt.current < HAND_SCROLL_MS) return;
    const box = scroller.current;
    const el = box?.children[current] as HTMLElement | undefined;
    if (box && el) box.scrollTo({ top: Math.max(0, el.offsetTop - 48), behavior: "smooth" });
  }, [current]);

  // Starts on its own like the app when the browser allows it; otherwise the play button does. Stops on leaving.
  useEffect(() => {
    const a = audio.current;
    a?.play().catch(() => {});
    return () => a?.pause();
  }, []);

  const seek = (t: number) => {
    const a = audio.current;
    if (!a) return;
    a.currentTime = Math.min(Math.max(0, t), duration || t);
    setTime(a.currentTime);
    setFinished(false);
  };
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (!a.paused) return a.pause();
    if (finished) {
      handAt.current = 0;
      seek(0);
    }
    a.play().catch(() => {});
  };
  const hand = () => (handAt.current = Date.now());
  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <div className="fn-rec">
      <audio
        ref={audio}
        src={recording.url}
        preload="auto"
        onPlay={() => {
          setPlaying(true);
          if (started.current) return;
          started.current = true;
          track("prayer_audio_played", { prayer_type: "funnel", prayer_slug: recording.slug });
        }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onEnded={() => {
          setPlaying(false);
          setFinished(true);
          track("prayer_audio_finished", { prayer_type: "funnel", prayer_slug: recording.slug });
        }}
      />
      <div className="top">
        {recording.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a cover on R2, any size
          <img src={recording.imageUrl} alt="" />
        ) : (
          <Scene name={recording.scene} seed={slug.length} />
        )}
        <Light size={96} state={playing ? "speaking" : "idle"} />
      </div>

      <div className="sheet">
        <span className="title">{recording.title}</span>
        <div className="words">
          <div className={`scroll ${finished ? "gone" : ""}`} ref={scroller} onWheel={hand} onTouchMove={hand}>
            {list.map((p, i) => (
              <button
                key={i}
                type="button"
                title="Play from here"
                className={`ph ${p.paragraph && i > 0 ? "para" : ""} ${i === current ? "now" : i < current ? "said" : ""}`}
                onClick={() => {
                  handAt.current = 0;
                  seek(p.start);
                  audio.current?.play().catch(() => {});
                }}
              >
                {p.text}
              </button>
            ))}
          </div>
          <div className={`amen ${finished ? "on" : ""}`} aria-hidden={!finished}>
            Amen.
          </div>
        </div>

        <div className="controls">
          <input
            type="range"
            className="bar"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Position in the prayer"
            style={{ "--p": `${pct}%` } as React.CSSProperties}
          />
          <div className="times">
            <span>{clock(time)}</span>
            <span>{clock(duration)}</span>
          </div>
          <div className="row">
            <button type="button" aria-label="Back 15 seconds" onClick={() => seek(time - SKIP)}>
              <SkipIcon />
            </button>
            <button type="button" className="play" aria-label={playing ? "Pause" : "Play"} onClick={toggle}>
              {playing ? (
                <svg width="22" height="22" viewBox="0 0 16 16" aria-hidden>
                  <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
                  <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 16 16" aria-hidden style={{ marginLeft: 2 }}>
                  <path d="M4 2.5v11a1 1 0 0 0 1.5.86l9-5.5a1 1 0 0 0 0-1.72l-9-5.5A1 1 0 0 0 4 2.5Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <button type="button" aria-label="Forward 15 seconds" onClick={() => seek(time + SKIP)}>
              <SkipIcon forward />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// The 28-day journey: four weeks with a theme each, and a small scene per week that moves from sunrise to evening.
const WEEK_SCENES = ["dawn", "meadow", "golden", "evening"];
const REMIND: Record<string, string> = {
  morning: "We'll remind you in the morning.",
  evening: "We'll remind you in the evening.",
  both: "We'll remind you in the morning and evening.",
};

function PathStep({ slug, answers, onNext }: { slug: string; answers: Answers; onNext: () => void }) {
  useEffect(() => track("plan_viewed", { funnel_slug: slug }), [slug]);

  return (
    <div className="fn-plan">
      <h2>{answers.firstName ? `${answers.firstName}, your 28-day prayer journey is ready` : "Your 28-day prayer journey is ready"}</h2>
      <p className="sub">
        Built from your answers: {journeyBasis(answers)}. A few minutes a day.{" "}
        {REMIND[answers.prayerTime ?? ""] ?? "We'll remind you at the time you pick."}
      </p>
      <ol className="fn-days">
        {JOURNEY_WEEKS.map(([week, theme], i) => (
          <li key={week} className={i === 0 ? "today" : undefined}>
            <Scene name={WEEK_SCENES[i]} seed={i} noBigTrees className="thumb" />
            <span>
              <em>{week}</em>
              <b>{theme}</b>
              {i === 0 && <small>Day 1 · your first prayer, today</small>}
            </span>
          </li>
        ))}
      </ol>
      <p className="fn-goal">
        Your companion checks in along the way, and your journal keeps what you prayed for and what changed. Goal: 5 days a week.
        Missed days never reset anything.
      </p>
      <ContinueButton onClick={onNext} />
    </div>
  );
}

// The paywall flow, with the funnel's prayer recording for the upsell's 15-second sample (fetched long before)
function PaywallStep({ slug, answers, email, mode }: { slug: string; answers: Answers; email?: string; mode: CheckoutMode }) {
  const [sample, setSample] = useState<Sample | null>(null);
  useEffect(() => {
    let live = true;
    firstPrayer(slug, answers).then((f) => live && "recording" in f && setSample({ title: f.recording.title, url: f.recording.url }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per visit
  }, []);
  return <PaywallFlow answers={answers} email={email} mode={mode} sample={sample} />;
}

// The email already has an account: we've emailed it a 6-digit code (and a link), so sign in right here and carry on
// with the funnel, without retyping the email on the sign-in page.
function WelcomeBack({ email, onSignedIn }: { email: string; onSignedIn: (userId: string) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await post<{ user: { id: string } }>("/api/auth/email/verify", { email, code, platform: "web" });
      track("login_code_used", { success: true, placement: "funnel" });
      onSignedIn(user.id);
    } catch (err) {
      track("login_code_used", { success: false, placement: "funnel" });
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    await post("/api/auth/email/start", { email }).catch(() => {});
    setResent(true);
    setCode("");
  }

  return (
    <Question title="Welcome back" subtitle={`You already have a ${SITE.name} account with ${email}.`}>
      <form onSubmit={verify}>
        <p className="fn-note">
          {resent ? "We sent a new code." : "We emailed you a 6-digit code."} Enter it to sign in, or tap the link in the
          same email. The code works for 15 minutes.
        </p>
        <input
          className="fn-input code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          placeholder="123456"
          aria-label="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
        {error && <p className="fn-error">{error}</p>}
        <div className="fn-sticky">
          <button type="submit" className="btn-ink full" disabled={busy || code.length !== 6}>
            {busy ? "One moment…" : "Sign in"}
            <span className="dot">
              <ArrowIcon />
            </span>
          </button>
        </div>
        <button type="button" className="pw-free" onClick={resend}>
          Send a new code
        </button>
      </form>
    </Question>
  );
}

// Saves the quiz to the signed-in account (Google/Apple here, or a sign-in before the quiz) with the funnel's
// attribution, as the email route does for a new email
async function saveToAccount(slug: string, answers: Answers, marketingOptIn: boolean) {
  await post("/api/me/onboarding", {
    answers,
    sensitiveConsent: true,
    funnelSlug: slug,
    paywallVariant: paywallVariant(),
    marketingOptIn,
    utm: load("pc_utm") ?? undefined,
  });
}

function EmailStep({ slug, signIn, answers, onDone }: { slug: string; signIn: SignInConfig; answers: Answers; onDone: (email: string) => void }) {
  // Already signed in (sent here by the web app, ?account=1): we have the email, only consent is asked
  const [account, setAccount] = useState<{ id: string; email: string } | null | undefined>(undefined);
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me: { user: { id: string; email: string } } | null) => setAccount(me?.user ?? null))
      .catch(() => setAccount(null));
  }, []);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  // Find the first prayer now, so it's ready right after this step
  useEffect(() => void firstPrayer(slug, answers), [slug, answers]);

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
      onDone(email.trim());
    } catch (err) {
      if (err instanceof PostError && err.code === "exists") setExists(true);
      else setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  // Google / Apple: the account exists now (new or not), so the answers go to it
  async function socialSignedIn(reply: { user: { id: string; email?: string }; isNew: boolean }) {
    setBusy(true);
    setError(null);
    try {
      identify(reply.user.id, { funnel_slug: slug, paywall_variant: paywallVariant() });
      await saveToAccount(slug, answers, marketing);
      track("email_submitted", { funnel_slug: slug });
      onDone(reply.user.email ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  async function continueSignedIn(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setBusy(true);
    setError(null);
    try {
      await saveToAccount(slug, answers, marketing);
      identify(account.id, { funnel_slug: slug, paywall_variant: paywallVariant() });
      track("email_submitted", { funnel_slug: slug });
      onDone(account.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  if (exists) return <WelcomeBack email={email.trim()} onSignedIn={(id) => (identify(id), onDone(email.trim()))} />;
  if (account === undefined) return <div className="fn-shell" aria-busy />;

  const consentBoxes = (
    <>
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
    </>
  );

  if (account) {
    return (
      <Question title="Save your prayer journey" subtitle={`You're signed in as ${account.email}. Your answers will be kept with your account.`}>
        <form onSubmit={continueSignedIn} className="fn-email">
          {consentBoxes}
          {error && <p className="fn-error">{error}</p>}
          <div className="fn-sticky">
            <button type="submit" className="btn-ink full" disabled={busy || !consent}>
              {busy ? "Saving…" : "Continue"}
              <span className="dot">
                <ArrowIcon />
              </span>
            </button>
          </div>
        </form>
      </Question>
    );
  }

  return (
    <Question title="Where should we send your prayer journey?" subtitle="Your account keeps your journey, your prayer journal and your answers. No password needed.">
      <form onSubmit={submit} className="fn-email">
        {consentBoxes}
        {/* Google / Apple work once consent is ticked, like the email button */}
        <div className={`fn-social ${consent ? "" : "off"}`} aria-disabled={!consent}>
          <SocialSignIn google={signIn.google} apple={signIn.apple} onSignedIn={socialSignedIn} onError={setError} />
          {!consent && <p className="fine center">Tick the first box to continue with Google or Apple.</p>}
        </div>
        <input
          className="fn-input"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
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
